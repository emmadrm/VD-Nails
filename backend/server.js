require("./instrument.js");
const Sentry = require("@sentry/node");

const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./db');
const { isValidDate, isValidTime, resolveHours, fitsInHours, startsWithinHours } = require('./businessHours');
const stripe = require('stripe')(process.env.STRIPE_SEC_KEY);
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const helmet = require('helmet');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const app = express();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: { error: "Πολλές αποτυχημένες προσπάθειες. Δοκιμάστε ξανά μετά από 15 λεπτά." } });
const adminLoginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: "Πολλές αποτυχημένες προσπάθειες. Δοκιμάστε ξανά μετά από 15 λεπτά." } });
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: { error: "Πολλά αιτήματα από αυτή την IP." } });
const cloudinary = require('cloudinary').v2;
const cloudinaryStorage = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET
});

// Η multer-storage-cloudinary καλεί εσωτερικά το cloudinary.v2, οπότε θέλει ολόκληρο το πακέτο και όχι το .v2
const storage = cloudinaryStorage({
  cloudinary: require('cloudinary'),
  params: {
    folder: 'vd-nails-products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
});

const upload = multer({ storage: storage });
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:5173'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(helmet({ crossOriginResourcePolicy: false }));
// Stripe webhook: χρειάζεται το ακατέργαστο σώμα του αιτήματος για τον έλεγχο υπογραφής, γι' αυτό δηλώνεται πριν το express.json()
app.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    return res.status(500).send('Webhook not configured');
  }
  let event;
  try { event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], secret); }
  catch (err) { return res.status(400).send(`Webhook signature error: ${err.message}`); }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object;
    const type = pi.metadata && pi.metadata.type;
    if (type === 'order' || type === 'appointment') {
      try {
        const result = await processPaidIntent(pi.id, type);
        // 5xx → το Stripe θα ξαναστείλει την ειδοποίηση αργότερα
        if (result.status >= 500) return res.status(500).send('Temporary error');
        if (result.status !== 200) console.warn(`Stripe webhook ${pi.id}: ${result.status} ${result.body.error}`);
      } catch (err) {
        console.error('Stripe webhook error:', err);
        Sentry.captureException(err);
        return res.status(500).send('Temporary error');
      }
    }
  }
  res.json({ received: true });
});

app.use(express.json());
app.use('/api/', apiLimiter);
app.use('/api/login', loginLimiter);
app.use('/api/admin/login', adminLoginLimiter);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.get('/', (req, res) => { res.send('Το Backend του VD Nails λειτουργεί τέλεια! 🚀'); });

const verifyAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(403).json({ error: 'Δεν υπάρχει άδεια πρόσβασης.' });
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Το πάσο έληξε ή είναι άκυρο.' });
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'Δεν υπάρχει άδεια πρόσβασης.' });
    next();
  });
};

// Δέχεται είτε admin είτε συνδεδεμένο πελάτη — ο έλεγχος ιδιοκτησίας γίνεται μέσα στο route
const verifyUserOrAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Δεν παρέχεται token πρόσβασης (Unauthorized)" });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: "Μη έγκυρο ή ληγμένο token (Forbidden)" });
    req.user = decoded;
    req.isAdmin = decoded.role === 'admin';
    next();
  });
};

// Προαιρετικός έλεγχος: true μόνο αν το αίτημα έχει έγκυρο admin token (δεν μπλοκάρει όταν λείπει)
const isAdminRequest = (req) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') && authHeader.split(' ')[1];
  if (!token) return false;
  try { return jwt.verify(token, process.env.JWT_SECRET).role === 'admin'; }
  catch { return false; }
};

const BLOCKED_CLIENT_NAME = "🔐 ΚΛΕΙΣΤΟ / ΡΕΠΟ";

const verifyOwnUser = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: "Δεν παρέχεται token πρόσβασης (Unauthorized)" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Μη έγκυρο ή ληγμένο token (Forbidden)" });
    }

    const targetId = req.params.id || req.params.userId;
    if (String(decoded.id) !== String(targetId)) {
      return res.status(403).json({ error: "Δεν έχετε πρόσβαση σε αυτόν τον πόρο." });
    }

    req.user = decoded;
    next();
  });
};

const sendBrevoTemplateEmail = async (toEmail, toName, templateId, params) => {
  try {
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'accept': 'application/json', 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ to: [{ email: toEmail, name: toName }], templateId: templateId, params: params })
    });
  } catch (err) {console.error(err.message)};
};

const sendBrevoSms = async (phone, content) => {
  try {
    const digits = String(phone).replace(/\D/g, '');
    const recipient = digits.startsWith('30') ? digits : `30${digits}`;
    const response = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
      method: 'POST',
      headers: { 'accept': 'application/json', 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({
        sender: process.env.BREVO_SMS_SENDER || 'VDNails',
        recipient,
        content,
        type: 'transactional',
        // Χωρίς αυτό το Brevo στέλνει σε GSM-7 και τα περισσότερα ελληνικά γράμματα χάνονται.
        // Με Unicode ένα SMS χωράει 70 χαρακτήρες (αλλιώς χρεώνεται ως πολλαπλό).
        unicodeEnabled: true
      })
    });
    if (!response.ok) {
      const body = await response.text();
      console.error(`Brevo SMS failed: ${response.status} ${response.statusText} - ${body}`);
    }
  } catch (err) { console.error(err.message); }
};

const sendBrevoEmail = async (toEmail, subject, htmlContent) => {
  const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.SENDER_EMAIL;
  if (!senderEmail) {
    throw new Error('Missing BREVO_SENDER_EMAIL or SENDER_EMAIL in environment');
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'accept': 'application/json', 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({
      sender: {
        email: senderEmail,
        name: process.env.BREVO_SENDER_NAME || 'VD Nails'
      },
      to: [{ email: toEmail }],
      subject,
      htmlContent
    })
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`Brevo email failed: ${response.status} ${response.statusText} - ${body}`);
    throw new Error(`Brevo email failed: ${response.status} ${response.statusText}`);
  }
};

// ---------- Πληρωμές: οι τιμές υπολογίζονται ΠΑΝΤΑ εδώ από τη βάση, ποτέ από τον browser ----------
const SHIPPING_FEE_CENTS = 200;
const FREE_SHIPPING_FROM_CENTS = 3900;
const STRIPE_MIN_CENTS = 50;
const toCents = (value) => Math.round(Number(value) * 100);

class PricingError extends Error {}

const isPositiveIntId = (v) => /^\d{1,9}$/.test(String(v)) && Number(v) > 0;

const priceOrder = async (products) => {
  if (!Array.isArray(products) || products.length === 0 || products.length > 50) throw new PricingError("Το καλάθι είναι άδειο ή μη έγκυρο.");
  const items = [];
  for (const item of products) {
    const qty = Number(item && item.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) throw new PricingError("Μη έγκυρη ποσότητα προϊόντος.");
    const lookup = isPositiveIntId(item.id)
      ? await pool.query('SELECT id, name, price, image_url, category FROM products WHERE id = $1', [Number(item.id)])
      : await pool.query('SELECT id, name, price, image_url, category FROM products WHERE name = $1 LIMIT 1', [String(item.name || '')]);
    const row = lookup.rows[0];
    if (!row) throw new PricingError(`Το προϊόν «${item.name || ''}» δεν είναι πλέον διαθέσιμο.`);
    items.push({ id: row.id, name: row.name, price: Number(row.price), qty, image_url: row.image_url, category: row.category });
  }
  const subtotalCents = items.reduce((sum, i) => sum + toCents(i.price) * i.qty, 0);
  const shippingCents = subtotalCents >= FREE_SHIPPING_FROM_CENTS ? 0 : SHIPPING_FEE_CENTS;
  return { items, totalCents: subtotalCents + shippingCents };
};

const priceServices = async (services) => {
  if (!Array.isArray(services) || services.length === 0 || services.length > 20) throw new PricingError("Επιλέξτε τουλάχιστον μία υπηρεσία.");
  const rows = [];
  for (const s of services) {
    const lookup = await pool.query('SELECT name, price, duration_minutes FROM services WHERE name = $1 LIMIT 1', [String((s && s.name) || '')]);
    if (!lookup.rows[0]) throw new PricingError(`Η υπηρεσία «${(s && s.name) || ''}» δεν είναι πλέον διαθέσιμη.`);
    rows.push(lookup.rows[0]);
  }
  return {
    name: rows.map(r => r.name).join(', '),
    priceCents: rows.reduce((sum, r) => sum + toCents(r.price), 0),
    duration: rows.reduce((sum, r) => sum + (parseInt(r.duration_minutes) || 0), 0),
  };
};

// Επιστρέφει το PaymentIntent μόνο αν είναι πληρωμένο, του σωστού τύπου και δεν έχει χρησιμοποιηθεί ήδη
const loadPaidIntent = async (paymentIntentId, type) => {
  if (typeof paymentIntentId !== 'string' || !/^pi_[A-Za-z0-9]+$/.test(paymentIntentId)) {
    return { status: 400, error: "Δεν βρέθηκε έγκυρη πληρωμή." };
  }
  let pi;
  try { pi = await stripe.paymentIntents.retrieve(paymentIntentId); }
  catch { return { status: 400, error: "Δεν βρέθηκε έγκυρη πληρωμή." }; }
  if (pi.status !== 'succeeded' || pi.currency !== 'eur') return { status: 402, error: "Η πληρωμή δεν έχει ολοκληρωθεί." };
  if (!pi.metadata || pi.metadata.type !== type) return { status: 400, error: "Η πληρωμή δεν αντιστοιχεί σε αυτή την ενέργεια." };
  const used = await pool.query(
    'SELECT 1 FROM orders WHERE stripe_payment_intent_id = $1 UNION ALL SELECT 1 FROM appointments WHERE stripe_payment_intent_id = $1 LIMIT 1',
    [paymentIntentId]
  );
  if (used.rows.length) return { status: 409, error: "Η πληρωμή αυτή έχει ήδη καταχωρηθεί." };
  return { pi };
};

const refundIntent = async (pi) => {
  try { await stripe.refunds.create({ payment_intent: pi.id }); return true; }
  catch (err) { console.error('Refund failed:', err); Sentry.captureException(err); return false; }
};

// Κρατάμε μόνο τα πεδία που χρειάζεται η καταχώρηση (τίποτα άλλο από το σώμα του αιτήματος)
const pickOrderPayload = (b = {}) => ({
  user_id: b.user_id || null,
  client_name: b.client_name, client_email: b.client_email, client_phone: b.client_phone,
  customer_notes: b.customer_notes || 'N/A',
  products: Array.isArray(b.products) ? b.products.map(p => ({ id: p && p.id, name: p && p.name, qty: p && p.qty })) : [],
  boxnow_locker: b.boxnow_locker || 'N/A',
});
const pickAppointmentPayload = (b = {}) => ({
  user_id: b.user_id || null,
  client_name: b.client_name, client_email: b.client_email, client_phone: b.client_phone,
  services: Array.isArray(b.services) ? b.services.map(s => ({ name: s && s.name })) : [],
  appointment_date: b.appointment_date, appointment_time: b.appointment_time,
  appointment_notes: b.appointment_notes || '',
});
const pickPayload = (type, body) => (type === 'order' ? pickOrderPayload(body) : pickAppointmentPayload(body));

const isValidIntentId = (id) => typeof id === 'string' && /^pi_[A-Za-z0-9]+$/.test(id);

// Ολοκληρώνει μία πληρωμένη παραγγελία/ραντεβού ΜΙΑ φορά, όποιος κι αν φτάσει πρώτος: ο browser του πελάτη
// ή το Stripe webhook (π.χ. αν ο πελάτης έκλεισε τη σελίδα ή πλήρωσε με τρόπο που κάνει ανακατεύθυνση).
// Το αποτέλεσμα αποθηκεύεται, ώστε κάθε επόμενη κλήση για την ίδια πληρωμή να παίρνει την ίδια απάντηση.
const processPaidIntent = async (paymentIntentId, type, fallbackPayload = null) => {
  if (!isValidIntentId(paymentIntentId)) return { status: 400, body: { error: "Δεν βρέθηκε έγκυρη πληρωμή." } };
  const lock = await acquireLocks([`payment:${paymentIntentId}`]);
  try {
    const row = (await lock.client.query('SELECT type, payload, result FROM pending_checkouts WHERE payment_intent_id = $1', [paymentIntentId])).rows[0];
    if (row && row.result) return row.result;
    if (row && row.type !== type) return { status: 400, body: { error: "Η πληρωμή δεν αντιστοιχεί σε αυτή την ενέργεια." } };
    const payload = row ? row.payload : fallbackPayload;
    if (!payload) return { status: 404, body: { error: "Δεν βρέθηκαν τα στοιχεία της παραγγελίας." } };

    const paid = await loadPaidIntent(paymentIntentId, type);
    // 409 = υπάρχει ήδη παραγγελία/ραντεβού με αυτή την πληρωμή (π.χ. προηγούμενη προσπάθεια που κόπηκε μετά την καταχώρηση)
    const alreadyRegistered = paid.status === 409;
    if (paid.error && !alreadyRegistered) return { status: paid.status, body: { error: paid.error } };

    const result = alreadyRegistered
      ? { status: 200, body: { success: true } }
      : type === 'order'
        ? await createOrder(payload, paid.pi)
        : await createAppointment(payload, { paidIntent: paid.pi });

    // Τα σφάλματα 5xx (π.χ. προσωρινό πρόβλημα βάσης) δεν «κλειδώνονται», ώστε να ξαναδοκιμαστούν
    if (result.status < 500) {
      await lock.client.query(
        `INSERT INTO pending_checkouts (payment_intent_id, type, payload, result, completed_at) VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (payment_intent_id) DO UPDATE SET result = $4, completed_at = NOW()`,
        [paymentIntentId, type, JSON.stringify(payload), JSON.stringify(result)]
      );
    }
    return result;
  } finally {
    await lock.release();
  }
};

// Ο browser αποθηκεύει τα στοιχεία λίγο πριν τη χρέωση της κάρτας
app.post('/api/checkout/prepare', async (req, res) => {
  const { payment_intent_id, type } = req.body;
  if (!isValidIntentId(payment_intent_id) || !['order', 'appointment'].includes(type)) {
    return res.status(400).json({ error: "Μη έγκυρο αίτημα πληρωμής." });
  }
  try {
    let pi;
    try { pi = await stripe.paymentIntents.retrieve(payment_intent_id); }
    catch { return res.status(400).json({ error: "Δεν βρέθηκε έγκυρη πληρωμή." }); }
    if (!pi.metadata || pi.metadata.type !== type) return res.status(400).json({ error: "Η πληρωμή δεν αντιστοιχεί σε αυτή την ενέργεια." });

    const result = await pool.query(
      `INSERT INTO pending_checkouts (payment_intent_id, type, payload) VALUES ($1, $2, $3)
       ON CONFLICT (payment_intent_id) DO UPDATE SET payload = $3 WHERE pending_checkouts.result IS NULL
       RETURNING payment_intent_id`,
      [payment_intent_id, type, JSON.stringify(pickPayload(type, req.body.payload))]
    );
    if (result.rows.length === 0) return res.status(409).json({ error: "Η πληρωμή αυτή έχει ήδη ολοκληρωθεί." });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Σφάλμα προετοιμασίας πληρωμής." });
  }
});

// Κατάσταση πληρωμής για τη σελίδα /success (π.χ. όταν ο πελάτης επιστρέφει από την τράπεζα)
app.get('/api/checkout/status/:paymentIntentId', async (req, res) => {
  const { paymentIntentId } = req.params;
  if (!isValidIntentId(paymentIntentId)) return res.status(400).json({ error: "Μη έγκυρη πληρωμή." });
  const describe = (type, result) => (result.status === 200
    ? { state: 'completed', type }
    : { state: 'failed', type, error: result.body.error });
  try {
    const row = (await pool.query('SELECT type, result FROM pending_checkouts WHERE payment_intent_id = $1', [paymentIntentId])).rows[0];
    if (row && row.result) return res.json(describe(row.type, row.result));

    let pi;
    try { pi = await stripe.paymentIntents.retrieve(paymentIntentId); }
    catch { return res.status(404).json({ error: "Η πληρωμή δεν βρέθηκε." }); }
    const type = pi.metadata && pi.metadata.type;
    if (pi.status === 'processing') return res.json({ state: 'processing', type });
    if (pi.status !== 'succeeded') return res.json({ state: 'failed', type, error: "Η πληρωμή δεν ολοκληρώθηκε. Δεν έγινε καμία χρέωση." });
    if (!row) return res.json({ state: 'processing', type });

    // Πληρώθηκε αλλά δεν έχει καταχωρηθεί ακόμα (το webhook δεν έχει φτάσει) → καταχώρηση τώρα
    const result = await processPaidIntent(paymentIntentId, row.type);
    if (result.status >= 500) return res.json({ state: 'processing', type });
    res.json(describe(row.type, result));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Σφάλμα ελέγχου πληρωμής." });
  }
});

app.post('/create-payment-intent', async (req, res) => {
  const { type, products, services } = req.body;
  try {
    let amount;
    if (type === 'order') amount = (await priceOrder(products)).totalCents;
    else if (type === 'appointment') amount = (await priceServices(services)).priceCents;
    else return res.status(400).json({ error: "Μη έγκυρο αίτημα πληρωμής." });

    if (amount < STRIPE_MIN_CENTS) return res.status(400).json({ error: "Το ποσό είναι πολύ μικρό για online πληρωμή." });

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'eur',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: { type },
    });
    res.json({ clientSecret: paymentIntent.client_secret, amount });
  } catch (error) {
    if (error instanceof PricingError) return res.status(400).json({ error: error.message });
    console.error(error);
    res.status(500).json({ error: "Σφάλμα δημιουργίας πληρωμής." });
  }
});

// Καταχωρεί πληρωμένη παραγγελία e-shop. paidIntent: η επαληθευμένη πληρωμή Stripe. Επιστρέφει { status, body }.
const createOrder = async (data, paidIntent) => {
  const { user_id, client_name, client_email, client_phone, customer_notes, products, boxnow_locker } = data;
  try {
    let priced;
    try { priced = await priceOrder(products); }
    catch (err) {
      if (!(err instanceof PricingError)) throw err;
      const refunded = await refundIntent(paidIntent);
      return { status: 409, body: { error: `${err.message} ${refunded ? 'Η χρέωση επιστράφηκε αυτόματα.' : 'Επικοινωνήστε μαζί μας για επιστροφή της χρέωσης.'}` } };
    }
    if (priced.totalCents !== paidIntent.amount_received) {
      const refunded = await refundIntent(paidIntent);
      return { status: 409, body: { error: `Το ποσό της πληρωμής δεν αντιστοιχεί στο καλάθι. ${refunded ? 'Η χρέωση επιστράφηκε αυτόματα.' : 'Επικοινωνήστε μαζί μας για επιστροφή της χρέωσης.'}` } };
    }

    const total_amount = priced.totalCents / 100;
    const result = await pool.query(
      `INSERT INTO orders (user_id, client_name, client_email, client_phone, customer_notes, products, boxnow_locker, total_amount, payment_status, status, stripe_payment_intent_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'completed', 'pending', $9) RETURNING id`,
      [user_id || null, client_name, client_email, client_phone, customer_notes || 'N/A', JSON.stringify(priced.items), boxnow_locker || 'N/A', total_amount, paidIntent.id]
    );
    const orderId = result.rows[0].id;
    for (const item of priced.items) {
      await pool.query('UPDATE products SET stock = GREATEST(stock - $1, 0) WHERE id = $2', [item.qty, item.id]);
    }
    const formattedProducts = priced.items.map(item => ({ ...item, price: Number(item.price).toFixed(2).replace('.', ',') }));
    const vatAmount = total_amount - (total_amount / 1.24);
    sendBrevoTemplateEmail(client_email, client_name, 1, { client_name, order_id: orderId, order_date: new Date().toLocaleDateString('el-GR'), customer_address: boxnow_locker || 'Δεν δηλώθηκε διεύθυνση', total_amount: total_amount.toFixed(2).replace('.', ','), vat_amount: vatAmount.toFixed(2).replace('.', ','), products: formattedProducts });
    return { status: 200, body: { success: true, orderId } };
  } catch (err) {
    if (err.code === '23505') return { status: 409, body: { error: "Η πληρωμή αυτή έχει ήδη καταχωρηθεί." } };
    console.error(err);
    return { status: 500, body: { error: "Αποτυχία καταχώρησης παραγγελίας" } };
  }
};

app.post('/api/orders', async (req, res) => {
  const result = await processPaidIntent(req.body.stripe_id, 'order', pickOrderPayload(req.body));
  res.status(result.status).json(result.body);
});

// Ο πελάτης μπορεί μόνο να ακυρώσει δική του παραγγελία που δεν έχει ακόμα σταλεί
app.put('/api/orders/:id', verifyUserOrAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!isPositiveIntId(id)) return res.status(400).json({ error: "Μη έγκυρη παραγγελία." });
  try {
    if (!req.isAdmin) {
      const order = (await pool.query('SELECT user_id, status FROM orders WHERE id = $1', [id])).rows[0];
      if (!order) return res.status(404).json({ error: "Η παραγγελία δεν βρέθηκε." });
      if (String(order.user_id) !== String(req.user.id)) return res.status(403).json({ error: "Δεν έχετε πρόσβαση σε αυτή την παραγγελία." });
      if (status !== 'cancelled') return res.status(403).json({ error: "Δεν επιτρέπεται αυτή η ενέργεια." });
      if (order.status && order.status !== 'pending') return res.status(409).json({ error: "Η παραγγελία δεν μπορεί πλέον να ακυρωθεί." });
    }
    await pool.query("UPDATE orders SET status = $1 WHERE id = $2", [status, id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/orders/:id/status', verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await pool.query('UPDATE orders SET status = $1 WHERE id = $2', [status, id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/orders', verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: "Σφάλμα" }); }
});

app.post('/api/admin/orders/update-shipment', verifyAdmin, async (req, res) => {
  const { saleId, shipped } = req.body;
  try {
    await pool.query('UPDATE orders SET shipped = $1 WHERE id = $2', [shipped, saleId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/orders/:id/tracking', verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { tracking_link } = req.body;
  try {
    await pool.query('UPDATE orders SET tracking_link = $1 WHERE id = $2', [tracking_link, id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const timeToMinutes = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const getEffectiveDuration = async (serviceName, ownDuration) => {
  if (ownDuration) return parseInt(ownDuration);
  const svc = await pool.query('SELECT duration_minutes FROM services WHERE name = $1', [serviceName]);
  return svc.rows[0] ? parseInt(svc.rows[0].duration_minutes) : 60;
};

const hasAppointmentOverlap = async (date, time, durationMinutes, excludeId = null, db = pool) => {
  const startMinutes = timeToMinutes(time);
  const endMinutes = startMinutes + durationMinutes;

  const query = `
    SELECT a.appointment_time, COALESCE(a.duration, s.duration_minutes, 60) as duration_minutes
    FROM appointments a
    LEFT JOIN services s ON a.service_name = s.name
    WHERE a.appointment_date = $1 AND a.status != 'cancelled'${excludeId ? ' AND a.id != $2' : ''}`;
  const params = excludeId ? [date, excludeId] : [date];
  const result = await db.query(query, params);

  return result.rows.some(row => {
    const existingStart = timeToMinutes(row.appointment_time.slice(0, 5));
    const existingEnd = existingStart + (parseInt(row.duration_minutes) || 60);
    return startMinutes < existingEnd && existingStart < endMinutes;
  });
};

// Κλείδωμα (advisory lock) σε μια συναλλαγή: όσο κρατιέται, κανένα άλλο αίτημα με το ίδιο κλειδί δεν προχωρά.
const acquireLocks = async (keys) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const key of [...new Set(keys)].sort()) {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [key]);
    }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    client.release();
    throw err;
  }
  return {
    client,
    release: async () => {
      try { await client.query('COMMIT'); } finally { client.release(); }
    }
  };
};

// Σειριοποιεί τις εγγραφές ραντεβού ανά ημερομηνία: όσο κρατιέται το lock, κανένα άλλο αίτημα για την ίδια μέρα
// δεν μπορεί να περάσει τον έλεγχο επικάλυψης. Έτσι ένα διπλό/τριπλό κλικ (ταυτόχρονα αιτήματα) δεν δημιουργεί διπλά ραντεβού.
const acquireDateLock = (...dates) => acquireLocks(dates.filter(Boolean).map(date => `appointments:${date}`));

const computeServiceTotals = (services) => {
  const name = services.map(s => s.name).join(', ');
  const price = services.reduce((sum, s) => sum + Number(s.price || 0), 0);
  const duration = services.reduce((sum, s) => sum + parseInt(s.duration_minutes || s.duration || 0), 0);
  return { name, price, duration };
};

const getEffectiveHours = async (date, db = pool) => {
  const override = await db.query('SELECT open_time, close_time FROM business_hours WHERE date = $1', [date]);
  return resolveHours(date, override.rows[0]);
};

// allowOvertime: ο admin μπορεί να κλείσει ραντεβού που ξεκινά μέσα στο ωράριο αλλά τελειώνει μετά το κλείσιμο
const isWithinBusinessHours = async (date, time, durationMinutes, allowOvertime = false, db = pool) => {
  if (!isValidDate(date) || !isValidTime(time)) return false;
  const hours = await getEffectiveHours(date, db);
  return allowOvertime ? startsWithinHours(hours, time, durationMinutes) : fitsInHours(hours, time, durationMinutes);
};

const isValidAdminAppointment = (date, time, durationMinutes) => {
  if (!isValidDate(date) || !isValidTime(time)) return false;
  const duration = Number(durationMinutes);
  if (!Number.isInteger(duration) || duration <= 0) return false;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes + duration <= 24 * 60;
};

app.get('/api/business-hours/:date', async (req, res) => {
  if (!isValidDate(req.params.date)) return res.status(400).json({ error: "Μη έγκυρη ημερομηνία." });
  try {
    const hours = await getEffectiveHours(req.params.date);
    res.json({ date: req.params.date, ...hours });
  } catch (err) { res.status(500).json({ error: "Σφάλμα" }); }
});

app.get('/api/admin/business-hours', verifyAdmin, async (req, res) => {
  const { startDate, endDate } = req.query;
  try {
    const result = await pool.query('SELECT * FROM business_hours WHERE date BETWEEN $1 AND $2 ORDER BY date ASC', [startDate, endDate]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: "Σφάλμα" }); }
});

app.post('/api/admin/business-hours', verifyAdmin, async (req, res) => {
  const { date, open_time, close_time } = req.body;
  const validCloseTime = isValidTime(close_time) || close_time === '24:00';
  if (!isValidDate(date) || !isValidTime(open_time) || !validCloseTime || open_time.slice(0, 5) >= close_time.slice(0, 5)) {
    return res.status(400).json({ error: "Μη έγκυρο ωράριο. Η ώρα έναρξης πρέπει να είναι πριν τη λήξη." });
  }
  try {
    const result = await pool.query(
      `INSERT INTO business_hours (date, open_time, close_time) VALUES ($1, $2, $3)
       ON CONFLICT (date) DO UPDATE SET open_time = $2, close_time = $3
       RETURNING *`,
      [date, open_time, close_time]
    );
    res.json({ success: true, businessHours: result.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/business-hours/:date', verifyAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM business_hours WHERE date = $1', [req.params.date]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/appointments/check-availability', async (req, res) => {
  const { date, time, service_name, duration } = req.query;
  try {
    const effectiveDuration = await getEffectiveDuration(service_name, duration);
    const overlap = await hasAppointmentOverlap(date, time, effectiveDuration);
    res.json({ available: !overlap });
  } catch (err) { res.status(500).json({ error: "Σφάλμα" }); }
});

// Καταχωρεί ραντεβού. paidIntent: η (ήδη επαληθευμένη) online πληρωμή, αλλιώς null για πληρωμή στο κατάστημα.
// Επιστρέφει { status, body } ώστε να καλείται τόσο από τον browser όσο και από το Stripe webhook.
const createAppointment = async (data, { isAdmin = false, paidIntent = null } = {}) => {
  const { user_id, client_name, client_email, client_phone, services, appointment_date, appointment_time, duration } = data;
  const rawNotes = data.appointment_notes ?? '';
  if (typeof rawNotes !== 'string' || rawNotes.length > 2000) {
    return { status: 400, body: { error: "Οι σημειώσεις δεν πρέπει να ξεπερνούν τους 2.000 χαρακτήρες." } };
  }
  const appointmentNotes = rawNotes.trim();
  let { service_name, service_price } = data;
  let lock = null;
  try {
    // Κλείδωμα ώρας και ραντεβού χωρίς υπηρεσίες από τον κατάλογο επιτρέπονται μόνο στον admin
    if (client_name === BLOCKED_CLIENT_NAME && !isAdmin) return { status: 403, body: { error: "Δεν επιτρέπεται αυτή η ενέργεια." } };

    let effectiveDuration, priceCents = null;
    if (services && services.length) {
      let totals;
      try { totals = await priceServices(services); }
      catch (err) {
        if (!(err instanceof PricingError) || !paidIntent) throw err;
        const refunded = await refundIntent(paidIntent);
        return { status: 409, body: { error: `${err.message} ${refunded ? 'Η χρέωση επιστράφηκε αυτόματα.' : 'Επικοινωνήστε μαζί μας για επιστροφή της χρέωσης.'}` } };
      }
      service_name = totals.name;
      priceCents = totals.priceCents;
      service_price = priceCents / 100;
      effectiveDuration = totals.duration;
    } else if (isAdmin && !paidIntent) {
      effectiveDuration = await getEffectiveDuration(service_name, duration);
    } else {
      if (paidIntent) {
        const refunded = await refundIntent(paidIntent);
        return { status: 400, body: { error: `Δεν επιλέχθηκε υπηρεσία. ${refunded ? 'Η χρέωση επιστράφηκε αυτόματα.' : 'Επικοινωνήστε μαζί μας για επιστροφή της χρέωσης.'}` } };
      }
      return { status: 400, body: { error: "Επιλέξτε τουλάχιστον μία υπηρεσία." } };
    }

    // Online πληρωμή: πρέπει να έχει πληρωθεί ακριβώς το σωστό ποσό
    if (paidIntent && paidIntent.amount_received !== priceCents) {
      const refunded = await refundIntent(paidIntent);
      return { status: 409, body: { error: `Το ποσό της πληρωμής δεν αντιστοιχεί στις υπηρεσίες. ${refunded ? 'Η χρέωση επιστράφηκε αυτόματα.' : 'Επικοινωνήστε μαζί μας για επιστροφή της χρέωσης.'}` } };
    }

    lock = await acquireDateLock(appointment_date);
    const validSlot = isAdmin
      ? isValidAdminAppointment(appointment_date, appointment_time, effectiveDuration)
      : await isWithinBusinessHours(appointment_date, appointment_time, effectiveDuration, false, lock.client);
    if (!validSlot) {
      if (paidIntent) {
        await refundIntent(paidIntent);
        return { status: 409, body: { error: "Η ώρα αυτή είναι εκτός ωραρίου λειτουργίας. Η χρέωση επιστράφηκε αυτόματα. Παρακαλούμε επιλέξτε άλλη ώρα." } };
      }
      return { status: 409, body: { error: "Η επιλεγμένη ώρα είναι εκτός ωραρίου λειτουργίας. Παρακαλούμε επιλέξτε άλλη ώρα." } };
    }

    const overlap = !isAdmin &&
      await hasAppointmentOverlap(appointment_date, appointment_time, effectiveDuration, null, lock.client);

    if (overlap) {
      if (paidIntent) {
        await refundIntent(paidIntent);
        return { status: 409, body: { error: "Η ώρα καταλήφθηκε λίγο πριν ολοκληρωθεί η πληρωμή σας. Η χρέωση επιστράφηκε αυτόματα. Παρακαλούμε επιλέξτε άλλη ώρα." } };
      }
      return { status: 409, body: { error: "Η επιλεγμένη ώρα δεν είναι πλέον διαθέσιμη. Παρακαλούμε επιλέξτε άλλη ώρα." } };
    }

    let paymentTypeStr = paidIntent ? 'Online Πληρωμή (Κάρτα)' : 'Πληρωμή στο Κατάστημα';
    const confirmationSmsEnabled = !isAdmin || data.send_confirmation_sms !== false;

    const query = `
      INSERT INTO appointments
      (user_id, client_name, client_email, client_phone, service_name, service_price, appointment_date, appointment_time, payment_type, payment_status, status, duration, stripe_payment_intent_id, appointment_notes, confirmation_sms_enabled)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id`;

    const values = [
      user_id || null,
      client_name,
      client_email,
      client_phone,
      service_name,
      service_price,
      appointment_date,
      appointment_time,
      paymentTypeStr,
      'completed',
      'confirmed',
      effectiveDuration,
      paidIntent ? paidIntent.id : null,
      appointmentNotes || null,
      confirmationSmsEnabled
    ];

    const result = await lock.client.query(query, values);
    await lock.release();
    lock = null;

    if (client_name !== BLOCKED_CLIENT_NAME && confirmationSmsEnabled) {
      const formattedDateForSms = appointment_date.split('-').reverse().join('/');
      const smsContent = `Το ραντεβού σας για τις ${formattedDateForSms} στις ${String(appointment_time).slice(0, 5)} έχει επιβεβαιωθεί. Σε περιμένω!`;
      sendBrevoSms(client_phone, smsContent);
    }
    return { status: 200, body: { success: true, appointmentId: result.rows[0].id } };
  } catch (err) {
    if (err instanceof PricingError) return { status: 400, body: { error: err.message } };
    if (err.code === '23505') return { status: 409, body: { error: "Η πληρωμή αυτή έχει ήδη καταχωρηθεί." } };
    console.error("SQL Error:", err);
    return { status: 500, body: { error: "Σφάλμα στη βάση δεδομένων" } };
  } finally {
    if (lock) await lock.release().catch(() => {});
  }
};

app.post('/api/appointments/direct', async (req, res) => {
  // Online πληρωμή: η καταχώρηση γίνεται μία φορά ανά πληρωμή (από εδώ ή από το Stripe webhook, όποιο φτάσει πρώτο)
  if (req.body.payment_method === 'prepay_success') {
    const result = await processPaidIntent(req.body.stripe_payment_intent_id, 'appointment', pickAppointmentPayload(req.body));
    return res.status(result.status).json(result.body);
  }
  const result = await createAppointment(req.body, { isAdmin: isAdminRequest(req) });
  res.status(result.status).json(result.body);
});

const APPOINTMENT_STATUSES = ['confirmed', 'completed', 'cancelled'];
const CLIENT_CHANGE_MIN_HOURS = 24;

// Φέρνει το ραντεβού μαζί με τις ώρες που απομένουν μέχρι την έναρξή του (ώρα Ελλάδας)
const getAppointmentWithTiming = async (id) => {
  const result = await pool.query(
    `SELECT id, user_id, client_name, client_phone, service_name, service_price, duration, status, appointment_time, confirmation_sms_enabled,
       TO_CHAR(appointment_date, 'YYYY-MM-DD') AS date_str,
       EXTRACT(EPOCH FROM (((appointment_date + appointment_time::time) AT TIME ZONE 'Europe/Athens') - NOW())) / 3600 AS hours_until
     FROM appointments WHERE id = $1`,
    [id]
  );
  return result.rows[0];
};

const isFutureSlot = async (date, time) => {
  const result = await pool.query(`SELECT (($1::date + $2::time) AT TIME ZONE 'Europe/Athens') > NOW() AS in_future`, [date, time]);
  return result.rows[0].in_future;
};

app.put('/api/appointments/:id/status', verifyUserOrAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, paid_amount, paid_method } = req.body;
  const sendCancellationSms = req.body.send_cancellation_sms;
  if (!APPOINTMENT_STATUSES.includes(status)) return res.status(400).json({ error: "Μη έγκυρη κατάσταση ραντεβού." });
  if ((paid_amount !== undefined || paid_method !== undefined) && (!req.isAdmin || status !== 'completed')) {
    return res.status(400).json({ error: "Τα στοιχεία πληρωμής μπορούν να οριστούν μόνο από τον admin κατά την ολοκλήρωση." });
  }
  if (sendCancellationSms !== undefined && (!req.isAdmin || status !== 'cancelled' || typeof sendCancellationSms !== 'boolean')) {
    return res.status(400).json({ error: "Η επιλογή SMS ακύρωσης δεν είναι έγκυρη." });
  }
  let lock = null;
  try {
    const apt = await getAppointmentWithTiming(id);
    if (!apt) return res.status(404).json({ error: "Το ραντεβού δεν βρέθηκε." });

    let completedAmount = null;
    const requiresPaymentDetails = req.isAdmin && status === 'completed' && apt.client_name !== BLOCKED_CLIENT_NAME;
    if (requiresPaymentDetails) {
      const amountText = String(paid_amount ?? apt.service_price);
      if (!/^\d{1,8}(?:[.,]\d{1,2})?$/.test(amountText)) {
        return res.status(400).json({ error: "Συμπληρώστε έγκυρο ποσό με έως δύο δεκαδικά ψηφία." });
      }
      if (!['cash', 'card'].includes(paid_method)) {
        return res.status(400).json({ error: "Επιλέξτε αν η πληρωμή έγινε με μετρητά ή κάρτα." });
      }
      completedAmount = Number(amountText.replace(',', '.')).toFixed(2);
    }

    // Ο πελάτης μπορεί μόνο να ακυρώσει δικό του, μη ολοκληρωμένο ραντεβού
    if (!req.isAdmin) {
      if (String(apt.user_id) !== String(req.user.id)) return res.status(403).json({ error: "Δεν έχετε πρόσβαση σε αυτό το ραντεβού." });
      if (status !== 'cancelled') return res.status(403).json({ error: "Δεν επιτρέπεται αυτή η ενέργεια." });
      if (apt.status !== 'confirmed') return res.status(409).json({ error: "Το ραντεβού δεν μπορεί πλέον να ακυρωθεί." });
      if (Number(apt.hours_until) < CLIENT_CHANGE_MIN_HOURS) {
        return res.status(403).json({ error: "Η ακύρωση ραντεβού επιτρέπεται μόνο έως και 24 ώρες πριν." });
      }
    }

    // Η επαναφορά ακυρωμένου ραντεβού απαιτεί η ώρα του να είναι ακόμα ελεύθερη
    lock = await acquireDateLock(apt.date_str);
    if (apt.status === 'cancelled' && status !== 'cancelled') {
      const effectiveDuration = await getEffectiveDuration(apt.service_name, apt.duration);
      if (await hasAppointmentOverlap(apt.date_str, apt.appointment_time.slice(0, 5), effectiveDuration, id, lock.client)) {
        return res.status(409).json({ error: "Η ώρα του ραντεβού έχει πλέον κλειστεί από άλλο ραντεβού." });
      }
    }

    const shouldNotifyCancellation = status === 'cancelled' &&
      apt.status !== 'cancelled' &&
      apt.client_name !== BLOCKED_CLIENT_NAME &&
      apt.client_phone &&
      (req.isAdmin
        ? sendCancellationSms === true
        : apt.confirmation_sms_enabled !== false);
    await lock.client.query(
      `UPDATE appointments
       SET status = $1::varchar,
           paid_amount = COALESCE($2::numeric, paid_amount),
           completion_payment_method = COALESCE($3::varchar, completion_payment_method)
       WHERE id = $4`,
      [status, completedAmount, requiresPaymentDetails ? paid_method : null, id]
    );
    await lock.release();
    lock = null;
    if (shouldNotifyCancellation) {
      const [year, month, day] = apt.date_str.split('-');
      const appointmentDate = `${day}/${month}/${year}`;
      const appointmentTime = apt.appointment_time.slice(0, 5);
      await sendBrevoSms(
        apt.client_phone,
        `Το ραντεβού σας στις ${appointmentDate} και ώρα ${appointmentTime} για ${apt.service_name} ακυρώθηκε. VD Nails.`
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error(`Appointment status update failed for appointment ${id}:`, err);
    res.status(500).json({ error: err.message });
  }
  finally { if (lock) await lock.release().catch(() => {}); }
});

app.get('/api/admin/appointments', verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM appointments ORDER BY appointment_date DESC, appointment_time DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: "Σφάλμα" }); }
});

app.put('/api/appointments/:id', verifyUserOrAdmin, async (req, res) => {
  const { id } = req.params;
  const { appointment_date, appointment_time } = req.body;
  let lock = null;
  try {
    const apt = await getAppointmentWithTiming(id);
    if (!apt) return res.status(404).json({ error: "Το ραντεβού δεν βρέθηκε." });

    // Ο πελάτης αλλάζει μόνο δικό του ενεργό ραντεβού, τουλάχιστον 24 ώρες πριν, και μόνο σε μελλοντική ώρα
    if (!req.isAdmin) {
      if (String(apt.user_id) !== String(req.user.id)) return res.status(403).json({ error: "Δεν έχετε πρόσβαση σε αυτό το ραντεβού." });
      if (apt.status !== 'confirmed') return res.status(409).json({ error: "Το ραντεβού δεν μπορεί πλέον να αλλάξει." });
      if (Number(apt.hours_until) < CLIENT_CHANGE_MIN_HOURS) {
        return res.status(403).json({ error: "Η αλλαγή ραντεβού επιτρέπεται μόνο έως και 24 ώρες πριν." });
      }
      if (!(await isFutureSlot(appointment_date, appointment_time))) {
        return res.status(409).json({ error: "Η επιλεγμένη ώρα έχει ήδη περάσει. Παρακαλούμε επιλέξτε άλλη ώρα." });
      }
    }

    const effectiveDuration = await getEffectiveDuration(apt.service_name, apt.duration);
    lock = await acquireDateLock(appointment_date);
    const validSlot = req.isAdmin
      ? isValidAdminAppointment(appointment_date, appointment_time, effectiveDuration)
      : await isWithinBusinessHours(appointment_date, appointment_time, effectiveDuration, false, lock.client);
    if (!validSlot) {
      return res.status(409).json({ error: "Η επιλεγμένη ώρα είναι εκτός ωραρίου λειτουργίας. Παρακαλούμε επιλέξτε άλλη ώρα." });
    }
    const overlap = await hasAppointmentOverlap(appointment_date, appointment_time, effectiveDuration, id, lock.client);
    if (overlap) return res.status(409).json({ error: "Η επιλεγμένη ώρα δεν είναι διαθέσιμη. Παρακαλούμε επιλέξτε άλλη ώρα." });

    await lock.client.query('UPDATE appointments SET appointment_date=$1, appointment_time=$2 WHERE id=$3', [appointment_date, appointment_time, id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
  finally { if (lock) await lock.release().catch(() => {}); }
});

app.put('/api/appointments/:id/details', verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { client_name, client_phone, client_email, services, appointment_date, appointment_time } = req.body;
  const rawNotes = req.body.appointment_notes ?? '';
  if (typeof rawNotes !== 'string' || rawNotes.length > 2000) {
    return res.status(400).json({ error: "Οι σημειώσεις δεν πρέπει να ξεπερνούν τους 2.000 χαρακτήρες." });
  }
  const appointmentNotes = rawNotes.trim();
  let { service_name, service_price } = req.body;
  let lock = null;
  try {
    let effectiveDuration;
    if (services && services.length) {
      const totals = computeServiceTotals(services);
      service_name = totals.name;
      service_price = totals.price;
      effectiveDuration = totals.duration;
    } else {
      effectiveDuration = await getEffectiveDuration(service_name, null);
    }

    lock = await acquireDateLock(appointment_date);
    if (!isValidAdminAppointment(appointment_date, appointment_time, effectiveDuration)) {
      return res.status(409).json({ error: "Η επιλεγμένη ώρα είναι εκτός ωραρίου λειτουργίας. Παρακαλούμε επιλέξτε άλλη ώρα." });
    }
    const overlap = await hasAppointmentOverlap(appointment_date, appointment_time, effectiveDuration, id, lock.client);
    if (overlap) return res.status(409).json({ error: "Η επιλεγμένη ώρα δεν είναι διαθέσιμη. Παρακαλούμε επιλέξτε άλλη ώρα." });

    if (services && services.length) {
      await lock.client.query(
        'UPDATE appointments SET client_name=$1, client_phone=$2, client_email=$3, service_name=$4, service_price=$5, appointment_date=$6, appointment_time=$7, duration=$8, appointment_notes=$9 WHERE id=$10',
        [client_name, client_phone, client_email, service_name, service_price, appointment_date, appointment_time, effectiveDuration, appointmentNotes || null, id]
      );
    } else {
      await lock.client.query(
        'UPDATE appointments SET client_name=$1, client_phone=$2, client_email=$3, service_name=$4, appointment_date=$5, appointment_time=$6, duration=$7, appointment_notes=$8 WHERE id=$9',
        [client_name, client_phone, client_email, service_name, appointment_date, appointment_time, effectiveDuration, appointmentNotes || null, id]
      );
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
  finally { if (lock) await lock.release().catch(() => {}); }
});

app.delete('/api/appointments/:id', verifyAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM appointments WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: "Σφάλμα" }); }
});

app.get('/api/products/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT DISTINCT category FROM products ORDER BY category');
    res.json(result.rows.map(r => r.category));
  } catch (err) { res.status(500).json({ error: "Σφάλμα" }); }
});

app.post('/api/products', verifyAdmin, upload.single('image'), async (req, res) => {
  const { name, description, price, stock, category } = req.body;
  // Το req.file.secure_url είναι το μόνιμο (https) URL από το Cloudinary
  const image_url = req.file ? req.file.secure_url : null;
  try {
    const result = await pool.query(
      'INSERT INTO products (name, description, price, image_url, stock, category) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, description, price, image_url, stock || 10, category || 'Γενικά']
    );
    res.json({ message: "Επιτυχία", product: result.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/products/:id', verifyAdmin, upload.single('image'), async (req, res) => {
  const { id } = req.params;
  const { name, description, price, stock, category } = req.body;
  try {
    if (req.file) {
      const image_url = req.file.secure_url; // URL από Cloudinary
      await pool.query('UPDATE products SET name=$1, description=$2, price=$3, stock=$4, image_url=$5, category=$6 WHERE id=$7', [name, description, price, stock, image_url, category || 'Γενικά', id]);
    } else {
      await pool.query('UPDATE products SET name=$1, description=$2, price=$3, stock=$4, category=$5 WHERE id=$6', [name, description, price, stock, category || 'Γενικά', id]);
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/products/:id', verifyAdmin, async (req, res) => {
  const { id } = req.params;
  try { await pool.query('DELETE FROM products WHERE id = $1', [id]); res.json({ message: "Διαγράφηκε!" }); }
  catch (err) { res.status(500).json({ error: "Σφάλμα" }); }
});

app.get('/api/services', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM services WHERE category <> 'Πρόσωπο' ORDER BY category, id ASC");
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: "Σφάλμα" }); }
});

app.post('/api/services', verifyAdmin, async (req, res) => {
  const { category, name, description, price, duration_minutes } = req.body;
  try {
    const result = await pool.query('INSERT INTO services (category, name, description, price, duration_minutes) VALUES ($1, $2, $3, $4, $5) RETURNING *', [category, name, description, price, duration_minutes || 60]);
    res.json({ message: "Επιτυχία", service: result.rows[0] });
  } catch (err) { res.status(500).json({ error: "Σφάλμα" }); }
});

app.put('/api/services/:id', verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { category, name, description, price, duration_minutes } = req.body;
  try {
    await pool.query('UPDATE services SET category=$1, name=$2, description=$3, price=$4, duration_minutes=$5 WHERE id=$6', [category, name, description, price, duration_minutes, id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/services/:id', verifyAdmin, async (req, res) => {
  const { id } = req.params;
  try { await pool.query('DELETE FROM services WHERE id = $1', [id]); res.json({ message: "Διαγράφηκε!" }); }
  catch (err) { res.status(500).json({ error: "Σφάλμα" }); }
});

app.get('/api/booked-times', async (req, res) => {
  const { date } = req.query;
  try {
    const result = await pool.query(`SELECT a.appointment_time, COALESCE(a.duration, s.duration_minutes, 60) as duration_minutes FROM appointments a LEFT JOIN services s ON a.service_name = s.name WHERE TO_CHAR(a.appointment_date, 'YYYY-MM-DD') = $1 AND a.status != 'cancelled'`, [date]);
    res.json(result.rows.map(row => ({ time: row.appointment_time.slice(0, 5), duration: parseInt(row.duration_minutes) || 60 })));
  } catch (err) { res.status(500).json({ error: "Σφάλμα" }); }
});

app.post('/api/register', async (req, res) => {
  const { name, email, phone, password } = req.body;
  try {
    const passwordHash = await bcrypt.hash(password, 10);

    // Αν ο admin έχει ήδη δημιουργήσει αυτόν τον πελάτη (όνομα+τηλέφωνο, χωρίς λογαριασμό ακόμα),
    // ολοκληρώνουμε ΤΗΝ ΙΔΙΑ εγγραφή αντί να φτιάξουμε διπλότυπο — έτσι το ιστορικό ραντεβού
    // που έχει ήδη καταχωρηθεί στο όνομά του παραμένει συνδεδεμένο.
    const stub = await pool.query(
      "SELECT id FROM users WHERE password_hash IS NULL AND regexp_replace(phone, '\\D', '', 'g') = regexp_replace($1, '\\D', '', 'g')",
      [phone]
    );

    let user;
    if (stub.rows.length > 0) {
      const result = await pool.query(
        `UPDATE users SET name = $1, email = $2, phone = $3, password_hash = $4 WHERE id = $5 RETURNING id, name, email, phone`,
        [name, email, phone, passwordHash, stub.rows[0].id]
      );
      user = result.rows[0];
    } else {
      const result = await pool.query(
        `INSERT INTO users (name, email, phone, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, name, email, phone`,
        [name, email, phone, passwordHash]
      );
      user = result.rows[0];
    }

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, token, user });
  } catch (err) { res.status(500).json({ error: "Σφάλμα" }); }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0 || !(await bcrypt.compare(password, result.rows[0].password_hash))) return res.status(400).json({ error: "Λάθος email ή κωδικός." });
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone } });
  } catch (err) { res.status(500).json({ error: "Σφάλμα" }); }
});

app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;
  console.log('Forgot-password request for:', email);
  if (!email) return res.status(400).json({ error: 'Το email είναι υποχρεωτικό.' });

  try {
    const result = await pool.query('SELECT id, name FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      console.log('Forgot-password: email not found, sending generic response:', email);
      return res.json({ message: 'Αν υπάρχει αυτό το email, θα λάβετε σύντομα οδηγίες επαναφοράς.' });
    }

    const user = result.rows[0];
    const token = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query('INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.id, token, expiresAt]);

    const frontendUrl = process.env.FRONTEND_URL;
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
    const html = `
      <p>Γεια σας ${user.name},</p>
      <p>Κάντε κλικ στον παρακάτω σύνδεσμο για να επαναφέρετε τον κωδικό σας:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>Ο σύνδεσμος λήγει σε 1 ώρα.</p>
    `;

    await sendBrevoEmail(email, 'Επαναφορά Κωδικού VD Nails', html);
    console.log('Forgot-password email sent successfully to:', email, 'via sender', process.env.BREVO_SENDER_EMAIL || process.env.SENDER_EMAIL);
    res.json({ message: 'Αν υπάρχει αυτό το email, θα λάβετε σύντομα οδηγίες επαναφοράς.' });
  } catch (err) {
    console.error('Forgot-password failed for', email, err);
    res.status(500).json({ error: 'Σφάλμα στην επεξεργασία του αιτήματος επαναφοράς.' });
  }
});

app.post('/api/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Απαιτείται token και νέος κωδικός.' });

  try {
    const tokenResult = await pool.query(
      'SELECT t.user_id, t.expires_at, t.used FROM password_reset_tokens t WHERE t.token = $1',
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Άκυρο ή ληγμένο token επαναφοράς.' });
    }

    const record = tokenResult.rows[0];
    if (record.used || new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Άκυρο ή ληγμένο token επαναφοράς.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, record.user_id]);
    await pool.query('UPDATE password_reset_tokens SET used = true WHERE token = $1', [token]);

    res.json({ message: 'Ο κωδικός επαναφέρθηκε με επιτυχία. Μπορείτε τώρα να συνδεθείτε.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Σφάλμα κατά την επαναφορά του κωδικού.' });
  }
});

app.get('/api/user/history/:userId', verifyOwnUser, async (req, res) => {
  try {
    const apts = await pool.query("SELECT * FROM appointments WHERE user_id = $1 ORDER BY appointment_date DESC", [req.params.userId]);
    const ords = await pool.query("SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC", [req.params.userId]);
    res.json({ appointments: apts.rows, orders: ords.rows });
  } catch (err) { res.status(500).json({ error: "Σφάλμα" }); }
});
app.put('/api/user/:id', verifyOwnUser, async (req, res) => {
  const { id } = req.params;
  const { email, phone } = req.body;
  try {
    await pool.query('UPDATE users SET email=$1, phone=$2 WHERE id=$3', [email, phone, id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/users', verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.name, u.email, u.phone, u.created_at,
        (u.password_hash IS NOT NULL) as has_account,
        COUNT(DISTINCT a.id) as appointment_count,
        COUNT(DISTINCT o.id) as order_count
      FROM users u
      LEFT JOIN appointments a ON a.user_id = u.id
      LEFT JOIN orders o ON o.user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: "Σφάλμα" }); }
});

app.post('/api/admin/users', verifyAdmin, async (req, res) => {
  const { name, phone } = req.body;
  if (!name || !phone) return res.status(400).json({ error: "Όνομα και τηλέφωνο είναι υποχρεωτικά." });
  try {
    const existing = await pool.query(
      "SELECT id FROM users WHERE regexp_replace(phone, '\\D', '', 'g') = regexp_replace($1, '\\D', '', 'g')",
      [phone]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Υπάρχει ήδη πελάτης με αυτό το τηλέφωνο." });
    }
    const result = await pool.query(
      `INSERT INTO users (name, phone, email, password_hash) VALUES ($1, $2, NULL, NULL)
       RETURNING id, name, email, phone, created_at, (password_hash IS NOT NULL) as has_account`,
      [name, phone]
    );
    res.json({ success: true, user: result.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/users/:id/history', verifyAdmin, async (req, res) => {
  try {
    const apts = await pool.query("SELECT * FROM appointments WHERE user_id = $1 ORDER BY appointment_date DESC, appointment_time DESC", [req.params.id]);
    const ords = await pool.query("SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC", [req.params.id]);
    res.json({ appointments: apts.rows, orders: ords.rows });
  } catch (err) { res.status(500).json({ error: "Σφάλμα" }); }
});

app.get('/api/admin/history-by-phone/:phone', verifyAdmin, async (req, res) => {
  try {
    const apts = await pool.query(
      "SELECT * FROM appointments WHERE regexp_replace(client_phone, '\\D', '', 'g') = regexp_replace($1, '\\D', '', 'g') ORDER BY appointment_date DESC, appointment_time DESC",
      [req.params.phone]
    );
    const ords = await pool.query(
      "SELECT * FROM orders WHERE regexp_replace(client_phone, '\\D', '', 'g') = regexp_replace($1, '\\D', '', 'g') ORDER BY created_at DESC",
      [req.params.phone]
    );
    res.json({ appointments: apts.rows, orders: ords.rows });
  } catch (err) { res.status(500).json({ error: "Σφάλμα" }); }
});

app.get('/api/admin/stats/sales', verifyAdmin, async (req, res) => {
  const { startDate, endDate } = req.query;
  try {
    const generalStats = await pool.query(`SELECT COUNT(id) as total_orders, COALESCE(SUM(total_amount), 0) as total_revenue, COALESCE(AVG(total_amount), 0) as average_order_value FROM orders WHERE status = 'completed' AND DATE(created_at) BETWEEN $1 AND $2`, [startDate, endDate]);
    const bestSellers = await pool.query(`SELECT p->>'name' as product_name, SUM((p->>'qty')::int) as total_quantity_sold, SUM(((p->>'price')::numeric) * ((p->>'qty')::int)) as total_sales_value FROM orders, jsonb_array_elements(products) as p WHERE status = 'completed' AND DATE(created_at) BETWEEN $1 AND $2 GROUP BY product_name ORDER BY total_quantity_sold DESC LIMIT 5`, [startDate, endDate]);
    const topCustomers = await pool.query(`SELECT client_name, client_phone, client_email, COUNT(id) as order_count, SUM(total_amount) as total_spent FROM orders WHERE status = 'completed' AND DATE(created_at) BETWEEN $1 AND $2 GROUP BY client_name, client_phone, client_email ORDER BY total_spent DESC LIMIT 5`, [startDate, endDate]);
    res.json({ summary: generalStats.rows[0], bestSellers: bestSellers.rows, topCustomers: topCustomers.rows });
  } catch (err) { res.status(500).json({ error: "Σφάλμα" }); }
});

app.get('/api/admin/stats/appointments', verifyAdmin, async (req, res) => {
  const { startDate, endDate } = req.query;
  try {
    const realizedStats = await pool.query(
      `SELECT 
        COUNT(id) as total_appointments, 
        COALESCE(SUM(COALESCE(paid_amount, service_price)), 0) as realized_revenue
       FROM appointments 
       WHERE status = 'completed' 
         AND appointment_date BETWEEN $1 AND $2 
         AND client_name != '🔐 ΚΛΕΙΣΤΟ / ΡΕΠΟ'`, 
      [startDate, endDate]
    );

    const futureStats = await pool.query(
      `SELECT 
        COALESCE(SUM(CAST(service_price AS NUMERIC)), 0) as future_revenue 
       FROM appointments 
       WHERE status IN ('confirmed', 'pending') 
         AND appointment_date >= CURRENT_DATE 
         AND client_name != '🔐 ΚΛΕΙΣΤΟ / ΡΕΠΟ'`
    );

    const topServices = await pool.query(
      `SELECT service_name, COUNT(id) as times_booked, SUM(COALESCE(paid_amount, service_price)) as total_generated_revenue
       FROM appointments 
       WHERE status = 'completed' AND appointment_date BETWEEN $1 AND $2 AND client_name != '🔐 ΚΛΕΙΣΤΟ / ΡΕΠΟ' 
       GROUP BY service_name ORDER BY times_booked DESC LIMIT 5`, 
      [startDate, endDate]
    );

    const frequentClients = await pool.query(
      `SELECT client_name, client_phone, client_email, COUNT(id) as visit_count, SUM(COALESCE(paid_amount, service_price)) as total_value
       FROM appointments 
       WHERE status = 'completed' AND appointment_date BETWEEN $1 AND $2 AND client_name != '🔐 ΚΛΕΙΣΤΟ / ΡΕΠΟ' 
       GROUP BY client_name, client_phone, client_email ORDER BY visit_count DESC LIMIT 5`, 
      [startDate, endDate]
    );

    res.json({ 
      summary: {
        total_appointments: realizedStats.rows[0].total_appointments,
        realized_revenue: realizedStats.rows[0].realized_revenue,
        future_revenue: futureStats.rows[0].future_revenue 
      }, 
      topServices: topServices.rows, 
      frequentClients: frequentClients.rows 
    });
  } catch (err) { 
    console.error(err);
    res.status(500).json({ error: "Σφάλμα" }); 
  }
});

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    res.json({ success: true, token: jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '8h' }) });
  } else { res.status(401).json({ success: false, message: 'Λάθος στοιχεία.' }); }
});

// The error handler must be registered before any other error middleware and after all controllers
Sentry.setupExpressErrorHandler(app);


const PORT = process.env.PORT || 5001;
pool.initDatabase().finally(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
});
require("./instrument.js");
const Sentry = require("@sentry/node");

const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./db');
const stripe = require('stripe')(process.env.STRIPE_SEC_KEY);
const bcrypt = require('bcrypt');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const app = express();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: { error: "Πολλές αποτυχημένες προσπάθειες. Δοκιμάστε ξανά μετά από 15 λεπτά." } });
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: { error: "Πολλά αιτήματα από αυτή την IP." } });
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
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
app.use(express.json());
app.use('/api/', apiLimiter);
app.use('/api/login', loginLimiter);
app.use('/api/admin/login', loginLimiter);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.get('/', (req, res) => { res.send('Το Backend του VD Nails λειτουργεί τέλεια! 🚀'); });

const verifyAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(403).json({ error: 'Δεν υπάρχει άδεια πρόσβασης.' });
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Το πάσο έληξε ή είναι άκυρο.' });
    next(); 
  });
};

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: "Δεν παρέχεται token πρόσβασης (Unauthorized)" });
  }

  jwt.verify(token, process.env.JWT_SECRET , (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Μη έγκυρο ή ληγμένο token (Forbidden)" });
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

app.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount } = req.body;
    const paymentIntent = await stripe.paymentIntents.create({ amount: amount, currency: 'eur' });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/orders', async (req, res) => {
  const { user_id, client_name, client_email, client_phone, customer_notes, products, boxnow_locker, total_amount, stripe_id } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO orders (user_id, client_name, client_email, client_phone, customer_notes, products, boxnow_locker, total_amount, payment_status, status, stripe_payment_intent_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'completed', 'pending', $9) RETURNING id`,
      [user_id || null, client_name, client_email, client_phone, customer_notes || 'N/A', JSON.stringify(products), boxnow_locker || 'N/A', total_amount, stripe_id]
    );
    const orderId = result.rows[0].id;
    const productsArray = typeof products === 'string' ? JSON.parse(products) : products;
    for (const item of productsArray) {
      if (item.id) { await pool.query('UPDATE products SET stock = GREATEST(stock - $1, 0) WHERE id = $2', [item.qty, item.id]); }
      else { await pool.query('UPDATE products SET stock = GREATEST(stock - $1, 0) WHERE name = $2', [item.qty, item.name]); }
    }
    const formattedProducts = productsArray.map(item => ({ ...item, price: Number(item.price).toFixed(2).replace('.', ',') }));
    const vatAmount = total_amount - (total_amount / 1.24);
    sendBrevoTemplateEmail(client_email, client_name, 1, { client_name, order_id: orderId, order_date: new Date().toLocaleDateString('el-GR'), customer_address: boxnow_locker || 'Δεν δηλώθηκε διεύθυνση', total_amount: total_amount.toFixed(2).replace('.', ','), vat_amount: vatAmount.toFixed(2).replace('.', ','), products: formattedProducts });
    res.json({ success: true, orderId: orderId });
  } catch (err) { res.status(500).json({ error: "Αποτυχία καταχώρησης παραγγελίας" }); }
});

app.put('/api/orders/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
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

app.post('/api/appointments/direct', async (req, res) => {
  const { user_id, client_name, client_email, client_phone, service_name, service_price, appointment_date, appointment_time, payment_method, duration } = req.body;
  try {
    let paymentTypeStr = payment_method === 'prepay_success' ? 'Online Πληρωμή (Κάρτα)' : 'Πληρωμή στο Κατάστημα';

    const query = `
      INSERT INTO appointments 
      (user_id, client_name, client_email, client_phone, service_name, service_price, appointment_date, appointment_time, payment_type, payment_status, status, duration) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
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
      duration || null 
    ];

    const result = await pool.query(query, values);

    if(client_name !== "🔐 ΚΛΕΙΣΤΟ / ΡΕΠΟ") {
      const formattedDateForEmail = appointment_date.split('-').reverse().join('/');
      sendBrevoTemplateEmail(client_email, client_name, 3, { 
        client_name, 
        appointment_date: formattedDateForEmail, 
        appointment_time, 
        appointment_id: `VD-${result.rows[0].id}`, 
        service_name, 
        service_cost: `${Number(service_price).toFixed(2)}€`, 
        customer_phone: client_phone 
      });
    }
    return res.json({ success: true });
  } catch (err) { 
    console.error("SQL Error:", err); 
    return res.status(500).json({ error: "Σφάλμα στη βάση δεδομένων" }); 
  }
});

app.put('/api/appointments/:id/status', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await pool.query('UPDATE appointments SET status = $1 WHERE id = $2', [status, id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/appointments', async (req, res) => {
  const { user_id, client_name, client_email, client_phone, service_name, appointment_date, appointment_time, amount_paid, payment_type, stripe_id } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO appointments (user_id, client_name, client_email, client_phone, service_name, appointment_date, appointment_time, amount_paid, payment_type, payment_status, status, stripe_payment_intent_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'completed', 'confirmed', $10) RETURNING id`,
      [user_id || null, client_name, client_email, client_phone, service_name, appointment_date, appointment_time, amount_paid, payment_type, stripe_id]
    );
    res.json({ success: true, appointmentId: result.rows[0].id });
  } catch (err) { res.status(500).json({ error: "Σφάλμα" }); }
});

app.get('/api/admin/appointments', verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM appointments ORDER BY appointment_date DESC, appointment_time DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: "Σφάλμα" }); }
});

app.put('/api/appointments/:id', async (req, res) => {
  const { id } = req.params;
  const { appointment_date, appointment_time } = req.body; 
  try {
    await pool.query('UPDATE appointments SET appointment_date=$1, appointment_time=$2 WHERE id=$3', [appointment_date, appointment_time, id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/appointments/:id', async (req, res) => {
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

app.post('/api/products', upload.single('image'), async (req, res) => {
  const { name, description, price, stock } = req.body;
  // Το req.file.path είναι πλέον το μόνιμο URL από το Cloudinary!
  const image_url = req.file ? req.file.path : null; 
  try {
    const result = await pool.query(
      'INSERT INTO products (name, description, price, image_url, stock) VALUES ($1, $2, $3, $4, $5) RETURNING *', 
      [name, description, price, image_url, stock || 10]
    );
    res.json({ message: "Επιτυχία", product: result.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/products/:id', upload.single('image'), async (req, res) => {
  const { id } = req.params;
  const { name, description, price, stock } = req.body;
  try {
    if (req.file) {
      const image_url = req.file.path; // URL από Cloudinary
      await pool.query('UPDATE products SET name=$1, description=$2, price=$3, stock=$4, image_url=$5 WHERE id=$6', [name, description, price, stock, image_url, id]);
    } else {
      await pool.query('UPDATE products SET name=$1, description=$2, price=$3, stock=$4 WHERE id=$5', [name, description, price, stock, id]);
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
    const result = await pool.query('SELECT * FROM services ORDER BY category, id ASC');
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
    const result = await pool.query(`INSERT INTO users (name, email, phone, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, name, email, phone`, [name, email, phone, passwordHash]);
    res.json({ success: true, user: result.rows[0] });
  } catch (err) { res.status(500).json({ error: "Σφάλμα" }); }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0 || !(await bcrypt.compare(password, result.rows[0].password_hash))) return res.status(400).json({ error: "Λάθος email ή κωδικός." });
    const user = result.rows[0];
    res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, phone: user.phone } });
  } catch (err) { res.status(500).json({ error: "Σφάλμα" }); }
});

app.get('/api/user/history/:userId', async (req, res) => {
  try {
    const apts = await pool.query("SELECT * FROM appointments WHERE user_id = $1 ORDER BY appointment_date DESC", [req.params.userId]);
    const ords = await pool.query("SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC", [req.params.userId]);
    res.json({ appointments: apts.rows, orders: ords.rows });
  } catch (err) { res.status(500).json({ error: "Σφάλμα" }); }
});
app.put('/api/user/:id', async (req, res) => {
  const { id } = req.params;
  const { email, phone } = req.body;
  try {
    await pool.query('UPDATE users SET email=$1, phone=$2 WHERE id=$3', [email, phone, id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
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
        COALESCE(SUM(CAST(service_price AS NUMERIC)), 0) as realized_revenue 
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
      `SELECT service_name, COUNT(id) as times_booked, SUM(CAST(service_price AS NUMERIC)) as total_generated_revenue 
       FROM appointments 
       WHERE status = 'completed' AND appointment_date BETWEEN $1 AND $2 AND client_name != '🔐 ΚΛΕΙΣΤΟ / ΡΕΠΟ' 
       GROUP BY service_name ORDER BY times_booked DESC LIMIT 5`, 
      [startDate, endDate]
    );

    const frequentClients = await pool.query(
      `SELECT client_name, client_phone, client_email, COUNT(id) as visit_count, SUM(CAST(service_price AS NUMERIC)) as total_value 
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
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

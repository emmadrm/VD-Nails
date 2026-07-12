const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./db');
const stripe = require('stripe')(process.env.STRIPE_SEC_KEY);
const bcrypt = require('bcrypt');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const app = express();

app.use(cors({
  origin: [
    'http://localhost:5173', 
    'https://vdnails.gr',    
  ],
  credentials: true 
}));
app.use(helmet());
app.use(express.json());


app.get('/', (req, res) => {
  res.send('Το Backend του VD Nails λειτουργεί τέλεια! 🚀');
});

const verifyAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(403).json({ error: 'Δεν υπάρχει άδεια πρόσβασης.' });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Το πάσο έληξε ή είναι άκυρο. Κάντε ξανά login.' });
    }
    next(); 
  });
};

const sendBrevoTemplateEmail = async (toEmail, toName, templateId, params) => {
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        to: [{ email: toEmail, name: toName }],
        templateId: templateId,
        params: params
      })
    });

    const data = await response.json(); 

    if (!response.ok) {
      console.error(" [BREVO API ERROR]:", data); 
    } else {
      console.log("[EMAIL SUCCESS] Στάλθηκε επιτυχώς! Message ID:", data.messageId);
    }
  } catch (err) {
    console.error("[NETWORK ERROR] Αποτυχία επικοινωνίας με Brevo:", err.message);
  }
};

// --- ΠΛΗΡΩΜΕΣ ---
app.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount } = req.body;
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'eur',
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- ΠΑΡΑΓΓΕΛΙΕΣ ---
app.post('/api/orders', async (req, res) => {
  const { user_id, client_name, client_email, client_phone, customer_notes, products, boxnow_locker, total_amount, stripe_id } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO orders (user_id, client_name, client_email, client_phone, customer_notes, products, boxnow_locker, total_amount, payment_status, stripe_payment_intent_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'completed', $9) RETURNING id`,
      [user_id || null, client_name, client_email, client_phone, customer_notes || 'N/A', JSON.stringify(products), boxnow_locker || 'N/A', total_amount, stripe_id]
    );

    const orderId = result.rows[0].id;
    const productsArray = typeof products === 'string' ? JSON.parse(products) : products;
    const formattedProducts = productsArray.map(item => ({
      ...item,
      price: Number(item.price).toFixed(2).replace('.', ',')
    }));
    const today = new Date().toLocaleDateString('el-GR');
    const finalTotal = Number(total_amount);
    
    const vatAmount = finalTotal - (finalTotal / 1.24);

    sendBrevoTemplateEmail(client_email, client_name, 1, {
      client_name: client_name,
      order_id: orderId,
      order_date: today,
      customer_address: boxnow_locker || 'Δεν δηλώθηκε διεύθυνση',
      total_amount: total_amount.toFixed(2).replace('.', ','),
      vat_amount: vatAmount.toFixed(2).replace('.', ','),
      products: formattedProducts
    });

    res.json({ success: true, orderId: orderId });
  } catch (err) {
    res.status(500).json({ error: "Αποτυχία καταχώρησης παραγγελίας" });
  }
});

app.post('/api/appointments/direct', async (req, res) => {
  const { 
    user_id, client_name, client_email, client_phone, 
    service_name, service_price, appointment_date, appointment_time, 
    payment_method, payment_status, stripe_payment_intent_id 
  } = req.body;

  try {
    let paymentTypeStr = 'Πληρωμή στο Κατάστημα';
    if (payment_method === 'prepay_success') {
      paymentTypeStr = 'Online Πληρωμή (Κάρτα)';
    }

    const result = await pool.query(
      `INSERT INTO appointments 
       (user_id, client_name, client_email, client_phone, service_name, service_price, appointment_date, appointment_time, payment_type, payment_status, stripe_payment_intent_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [
        user_id || null, 
        client_name, 
        client_email, 
        client_phone, 
        service_name, 
        service_price, 
        appointment_date, 
        appointment_time, 
        paymentTypeStr, 
        payment_status || 'completed', 
        stripe_payment_intent_id || null
      ]
    );

    const newAppointmentId = result.rows[0].id;

    const formattedDateForEmail = appointment_date.split('-').reverse().join('/');

    sendBrevoTemplateEmail(
      client_email,             
      client_name,             
      3,                    
      {                           
        client_name: client_name,
        appointment_date: formattedDateForEmail,
        appointment_time: appointment_time,
        appointment_id: `VD-${newAppointmentId}`, 
        service_name: service_name,
        service_cost: `${Number(service_price).toFixed(2)}€`,
        customer_phone: client_phone
      }
    );

    return res.json({ success: true });

  } catch (err) {
    console.error("❌ Σφάλμα αποθήκευσης ραντεβού:", err);
    return res.status(500).json({ error: "Σφάλμα κατά την καταχώρηση του ραντεβού." });
  }
});

app.put('/api/orders/:id', async (req, res) => {
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
  } catch (err) { res.status(500).json({ error: "Σφάλμα λήψης παραγγελιών" }); }
});

// --- ΡΑΝΤΕΒΟΥ ---
app.post('/api/appointments', async (req, res) => {
  const { user_id, client_name, client_email, client_phone, service_name, appointment_date, appointment_time, amount_paid, payment_type, stripe_id } = req.body;
  try {
    const appointmentResult = await pool.query(
      `INSERT INTO appointments (user_id, client_name, client_email, client_phone, service_name, appointment_date, appointment_time, amount_paid, payment_type, payment_status, stripe_payment_intent_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'completed', $10) RETURNING id`,
      [user_id || null, client_name, client_email, client_phone, service_name, appointment_date, appointment_time, amount_paid, payment_type, stripe_id]
    );
    res.json({ success: true, appointmentId: appointmentResult.rows[0].id });
  } catch (err) { res.status(500).json({ error: "Αποτυχία καταχώρησης ραντεβού" }); }
});

app.get('/api/admin/appointments', verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM appointments ORDER BY appointment_date DESC, appointment_time DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: "Σφάλμα φόρτωσης ραντεβού" }); }
});

app.post('/api/admin/orders/update-shipment',verifyAdmin, async (req, res) => {
  const { id, shipped } = req.body;
  try {
    await pool.query('UPDATE orders SET shipped = $1 WHERE id = $2', [shipped, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/appointments/:id', async (req, res) => {
  const { id } = req.params;
  const { appointment_date, appointment_time } = req.body; 
  
  try {
    await pool.query(
      'UPDATE appointments SET appointment_date=$1, appointment_time=$2 WHERE id=$3', 
      [appointment_date, appointment_time, id]
    );
    res.json({ success: true });
  } catch (err) { 
    console.error("SQL Error:", err); 
    res.status(500).json({ error: err.message }); 
  }
});

app.delete('/api/appointments/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM appointments WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- ΠΡΟΪΟΝΤΑ ---
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: "Σφάλμα λήψης προϊόντων" }); }
});

app.post('/api/products', async (req, res) => {
  const { name, description, price, image_url, stock } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO products (name, description, price, image_url, stock) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, description, price, image_url, stock || 10]
    );
    res.json({ message: "Το προϊόν προστέθηκε!", product: result.rows[0] });
  } catch (err) { res.status(500).json({ error: "Σφάλμα προσθήκης προϊόντος" }); }
});

app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, price, stock, image_url } = req.body;
  try {
    await pool.query('UPDATE products SET name=$1, description=$2, price=$3, stock=$4, image_url=$5 WHERE id=$6', [name, description, price, stock, image_url, id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try { await pool.query('DELETE FROM products WHERE id = $1', [id]); res.json({ message: "Διαγράφηκε!" }); }
  catch (err) { res.status(500).json({ error: "Σφάλμα διαγραφής" }); }
});

// --- ΥΠΗΡΕΣΙΕΣ ---
app.get('/api/services', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM services ORDER BY category, id ASC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: "Σφάλμα λήψης υπηρεσιών" }); }
});

app.post('/api/services', async (req, res) => {
  const { category, name, description, price, duration_minutes } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO services (category, name, description, price, duration_minutes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [category, name, description, price, duration_minutes || 60]
    );
    res.json({ message: "Η υπηρεσία προστέθηκε επιτυχώς!", service: result.rows[0] });
  } catch (err) { res.status(500).json({ error: "Σφάλμα προσθήκης υπηρεσίας" }); }
});

app.put('/api/services/:id', async (req, res) => {
  const { id } = req.params;
  const { category, name, description, price, duration_minutes } = req.body;
  try {
    await pool.query(
      'UPDATE services SET category=$1, name=$2, description=$3, price=$4, duration_minutes=$5 WHERE id=$6',
      [category, name, description, price, duration_minutes, id]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/services/:id', async (req, res) => {
  const { id } = req.params;
  try { await pool.query('DELETE FROM services WHERE id = $1', [id]); res.json({ message: "Διαγράφηκε!" }); }
  catch (err) { res.status(500).json({ error: "Σφάλμα διαγραφής" }); }
});

// --- ΔΙΑΘΕΣΙΜΟΤΗΤΑ ΡΑΝΤΕΒΟΥ ---
app.get('/api/booked-times', async (req, res) => {
  const { date } = req.query;
  try {
    const result = await pool.query(
      `SELECT a.appointment_time, s.duration_minutes 
       FROM appointments a
       LEFT JOIN services s ON a.service_name = s.name
       WHERE TO_CHAR(a.appointment_date, 'YYYY-MM-DD') = $1`, [date]
    );
    res.json(result.rows.map(row => ({ 
      time: row.appointment_time.slice(0, 5), 
      duration: parseInt(row.duration_minutes) || 60 
    })));
  } catch (err) { 
    console.error(err);
    res.status(500).json({ error: "Σφάλμα λήψης ραντεβού" }); 
  }
});

// --- ΧΡΗΣΤΕΣ ---
app.post('/api/register', async (req, res) => {
  const { name, email, phone, password } = req.body;
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(`INSERT INTO users (name, email, phone, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, name, email, phone`, [name, email, phone, passwordHash]);
    res.json({ success: true, user: result.rows[0] });
  } catch (err) { res.status(500).json({ error: "Σφάλμα εγγραφής" }); }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0 || !(await bcrypt.compare(password, result.rows[0].password_hash))) {
      return res.status(400).json({ error: "Λάθος email ή κωδικός." });
    }
    const user = result.rows[0];
    res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, phone: user.phone } });
  } catch (err) { res.status(500).json({ error: "Σφάλμα σύνδεσης" }); }
});

app.get('/api/user/history/:userId', async (req, res) => {
  try {
    const apts = await pool.query("SELECT * FROM appointments WHERE user_id = $1 ORDER BY appointment_date DESC", [req.params.userId]);
    const ords = await pool.query("SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC", [req.params.userId]);
    res.json({ appointments: apts.rows, orders: ords.rows });
  } catch (err) { res.status(500).json({ error: "Σφάλμα λήψης ιστορικού" }); }
});

app.put('/api/user/:id', async (req, res) => {
  const { id } = req.params;
  const { email, phone } = req.body;
  try {
    await pool.query('UPDATE users SET email=$1, phone=$2 WHERE id=$3', [email, phone, id]);
    res.json({ success: true });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

app.use((err, req, res, next) => {
  console.error(`[ERROR] ${new Date().toISOString()} - ${err.message}`);
  res.status(500).json({ error: "Κάτι πήγε στραβά, προσπαθήστε ξανά αργότερα." });
});

// --- ADMIN STATS: ΠΩΛΗΣΕΙΣ & ΠΡΟΪΟΝΤΑ ---
app.get('/api/admin/stats/sales', verifyAdmin, async (req, res) => {
  const { startDate, endDate } = req.query; // Μορφή: YYYY-MM-DD
  
  try {
    // 1. Γενικά Στοιχεία: Συνολικές Παραγγελίες & Συνολικός Τζίρος Πωλήσεων
    const generalStats = await pool.query(
      `SELECT 
        COUNT(id) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(AVG(total_amount), 0) as average_order_value
       FROM orders 
       WHERE DATE(created_at) BETWEEN $1 AND $2`, 
      [startDate, endDate]
    );

    // 2. Best Seller Προϊόντα (Ομαδοποίηση και άθροιση των qty από το JSONB array ή τον πίνακα προϊόντων)
    // Σημείωση: Αν τα προϊόντα σου είναι αποθηκευμένα ως JSONB array στην orders, το query ξεδιπλώνει το array:
    const bestSellers = await pool.query(
      `SELECT 
        p->>'name' as product_name,
        SUM((p->>'qty')::int) as total_quantity_sold,
        SUM(((p->>'price')::numeric) * ((p->>'qty')::int)) as total_sales_value
       FROM orders,
       jsonb_array_elements(products) as p
       WHERE DATE(created_at) BETWEEN $1 AND $2
       GROUP BY product_name
       ORDER BY total_quantity_sold DESC
       LIMIT 5`,
      [startDate, endDate]
    );

    // 3. Top Πελάτες βάσει τζίρου αγορών
    const topCustomers = await pool.query(
      `SELECT 
        client_name,
        client_phone,
        client_email,
        COUNT(id) as order_count,
        SUM(total_amount) as total_spent
       FROM orders
       WHERE DATE(created_at) BETWEEN $1 AND $2
       GROUP BY client_name, client_phone, client_email
       ORDER BY total_spent DESC
       LIMIT 5`,
      [startDate, endDate]
    );

    res.json({
      summary: generalStats.rows[0],
      bestSellers: bestSellers.rows,
      topCustomers: topCustomers.rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Σφάλμα υπολογισμού στατιστικών πωλήσεων" });
  }
});

// --- ADMIN STATS: ΡΑΝΤΕΒΟΥ & ΥΠΗΡΕΣΙΕΣ ---
app.get('/api/admin/stats/appointments', verifyAdmin, async (req, res) => {
  const { startDate, endDate } = req.query;

  try {
    // 1. Γενικά Στοιχεία Ραντεβού: Σύνολο, Ολοκληρωμένα, Έσοδα (εξαιρώντας τα ΚΛΕΙΣΤΟ/ΡΕΠΟ)
    const generalStats = await pool.query(
      `SELECT 
        COUNT(id) as total_appointments,
        COALESCE(SUM(CASE WHEN appointment_date <= CURRENT_DATE THEN CAST(service_price AS NUMERIC) ELSE 0 END), 0) as realized_revenue,
        COALESCE(SUM(CASE WHEN appointment_date > CURRENT_DATE THEN CAST(service_price AS NUMERIC) ELSE 0 END), 0) as future_revenue,
        COUNT(CASE WHEN payment_status = 'completed' THEN 1 END) as paid_appointments
       FROM appointments 
       WHERE appointment_date BETWEEN $1 AND $2
         AND client_name != '🔐 ΚΛΕΙΣΤΟ / ΡΕΠΟ'`,
      [startDate, endDate]
    );

    // 2. Best Seller Υπηρεσίες (Top Δημοφιλείς)
    const topServices = await pool.query(
      `SELECT 
        service_name,
        COUNT(id) as times_booked,
        SUM(service_price) as total_generated_revenue
       FROM appointments
       WHERE appointment_date BETWEEN $1 AND $2
         AND client_name != '🔐 ΚΛΕΙΣΤΟ / ΡΕΠΟ'
       GROUP BY service_name
       ORDER BY times_booked DESC
       LIMIT 5`,
      [startDate, endDate]
    );

    // 3. Πιο Συχνοί Πελάτες στα Ραντεβού (Πιστότητα / Loyalty)
    const frequentClients = await pool.query(
      `SELECT 
        client_name,
        client_phone,
        client_email,
        COUNT(id) as visit_count,
        SUM(service_price) as total_value
       FROM appointments
       WHERE appointment_date BETWEEN $1 AND $2
         AND client_name != '🔐 ΚΛΕΙΣΤΟ / ΡΕΠΟ'
       GROUP BY client_name, client_phone, client_email
       ORDER BY visit_count DESC
       LIMIT 5`,
      [startDate, endDate]
    );

    res.json({
      summary: generalStats.rows[0],
      topServices: topServices.rows,
      frequentClients: frequentClients.rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Σφάλμα υπολογισμού στατιστικών ραντεβού" });
  }
});

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;

  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '8h' });
    
    res.json({ success: true, token: token });
  } else {
    res.status(401).json({ success: false, message: 'Λάθος στοιχεία σύνδεσης.' });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
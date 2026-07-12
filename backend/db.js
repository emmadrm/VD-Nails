const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const initDatabase = async () => {
  try {
    // 1. ΠΙΝΑΚΑΣ: Προϊόντα
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        image_url TEXT,
        stock INT DEFAULT 10,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. ΠΙΝΑΚΑΣ: Παραγγελίες
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        client_name VARCHAR(255) NOT NULL,
        client_email VARCHAR(255) NOT NULL,
        client_phone VARCHAR(20) NOT NULL,
        products JSONB NOT NULL,
        boxnow_locker TEXT NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        payment_status VARCHAR(50) DEFAULT 'pending',
        status VARCHAR(20) DEFAULT 'pending',
        shipped BOOLEAN DEFAULT FALSE,
        stripe_payment_intent_id VARCHAR(255),
        user_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. ΠΙΝΑΚΑΣ: Ραντεβού
    await pool.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        client_name VARCHAR(255) NOT NULL,
        client_email VARCHAR(255) NOT NULL,
        client_phone VARCHAR(20) NOT NULL,
        service_name VARCHAR(150) NOT NULL,
        appointment_date DATE NOT NULL,
        appointment_time VARCHAR(50) NOT NULL,
        payment_type VARCHAR(50) NOT NULL,
        service_price NUMERIC(10,2) NOT NULL,
        payment_status VARCHAR(50) DEFAULT 'pending',
        status VARCHAR(20) DEFAULT 'confirmed',
        stripe_payment_intent_id VARCHAR(255),
        user_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. ΠΙΝΑΚΑΣ: Υπηρεσίες (Περιλαμβάνει πλέον description)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        category VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        duration_minutes INT DEFAULT 60
      );
    `);

    // 5. ΠΙΝΑΚΑΣ: Διαθέσιμες Ώρες
    await pool.query(`
      CREATE TABLE IF NOT EXISTS time_slots (
        id SERIAL PRIMARY KEY,
        slot_date DATE NOT NULL,
        slot_time TIME NOT NULL,
        is_booked BOOLEAN DEFAULT FALSE,
        UNIQUE(slot_date, slot_time)
      );
    `);

    // 6. ΠΙΝΑΚΑΣ: Χρήστες
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20) NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Αρχικές τιμές για Υπηρεσίες αν είναι άδειες
    const serviceCheck = await pool.query('SELECT COUNT(*) FROM services');
    if (parseInt(serviceCheck.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO services (category, name, description, price, duration_minutes) VALUES
        ('Χέρια', 'Μανικιούρ Απλό', 'Καθαρισμός επωνυχίων και περιποίηση νυχιών.', 15.00, 60),
        ('Χέρια', 'Μανικιούρ Ημιμόνιμο', 'Το κλασικό μανικιούρ με διάρκεια χρώματος έως 3 εβδομάδες.', 20.00, 90),
        ('Χέρια', 'Gel / Ακρυλικό', 'Ενίσχυση για τέλειο σχήμα και μεγάλη αντοχή.', 35.00, 120),
        ('Πόδια', 'Πεντικιούρ Απλό', 'Περιποίηση πέλματος και νυχιών.', 20.00, 60),
        ('Πρόσωπο', 'Καθαρισμός Προσώπου', 'Βαθύς καθαρισμός για λάμψη και αναζωογόνηση.', 40.00, 60);
      `);
    }

    console.log("✅ Η βάση δεδομένων είναι ενημερωμένη και έτοιμη!");
  } catch (err) {
    console.error("❌ Σφάλμα αρχικοποίησης βάσης:", err);
  }
};

initDatabase();

module.exports = pool;
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const stripe = require('stripe')(process.env.STRIPE_SEC_KEY);

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Το Backend του VD Nails λειτουργεί τέλεια! 🚀');
});

app.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount } = req.body; 

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'eur',
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
    });
    
  } catch (error) {
    console.error("Σφάλμα κατά τη δημιουργία πληρωμής:", error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`✅ Ο Server ξύπνησε και ακούει στη θύρα ${PORT}`);
});
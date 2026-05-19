import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import '../index.css';
import { useNavigate } from 'react-router-dom';

const stripePromise = loadStripe('pk_test_51TOQ4XIeXTRO576mOVDZujPkepiG71IihruMKXAUGHw4QgOINWIMMFJmfewClPQzRYiwdRvTiio5qfgr7L5QpNZS00XvdDD41X');

const PaymentForm = ({ finalTotal, emptyCart , cart }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    if (!stripe || !elements) return; 

    setProcessing(true);
    setError(null);

    try {
      const res = await fetch('http://localhost:5001/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Math.round(finalTotal * 100) }) 
      });
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      const clientSecret = data.clientSecret;

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            name: 'Πελάτης VD Nails', 
          },
        }
      });

      if (result.error) {
        setError(result.error.message);
      } else {
        if (result.paymentIntent.status === 'succeeded') {
          const hasAppointment = cart.some(item => item.isAppointment);
          emptyCart();
          navigate('/success', { state: { isAppointment: hasAppointment } });
        }
      }
    } catch (err) {
      console.error(err);
      setError('Υπήρξε κάποιο πρόβλημα με τη σύνδεση.');
    }
    
    setProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mock-stripe-container">
        <div className="form-group">
          <label>Στοιχεία Κάρτας</label>
          <div className="card-inputs-wrapper" style={{ padding: '15px', width: '100%', backgroundColor: '#ffffff', minHeight: '50px' }}>
            <CardElement options={{ style: { base: { fontSize: '16px', color: '#3b2b1f' } } }} />
          </div>
        </div>
      </div>

      {error && <div style={{ color: '#ef4444', marginTop: '10px', fontSize: '0.9rem' }}>{error}</div>}

      <div className="terms-checkbox">
        <label>
          <input type="checkbox" required />
          <span>Έχω διαβάσει και συμφωνώ με τους <a href="#">Όρους Χρήσης</a> και την <a href="#">Πολιτική Απορρήτου</a>. *</span>
        </label>
      </div>

      <button type="submit" disabled={!stripe || processing} className="pay-now-btn">
        {processing ? 'Επεξεργασία Πληρωμής...' : `Ολοκλήρωση & Πληρωμή ${finalTotal.toFixed(2)}€`}
      </button>
    </form>
  );
};

export default function Checkout({ cart, setCart }) {
  const [boxNowLocker, setBoxNowLocker] = useState(null);

  const hasAppointment = cart.some(item => item.isAppointment);
  // Υπολογισμοί με βάση το cart που έρχεται ως prop
  const cartSubtotal = cart ? cart.reduce((total, item) => total + (item.price * item.qty), 0) : 0;
  const shippingCost = (hasAppointment || cart.length === 0) ? 0 : 2.00;
  const finalTotal = cartSubtotal + shippingCost;

  // Η συνάρτηση που αδειάζει το καλάθι χρησιμοποιώντας το setCart του App.jsx
  const emptyCart = () => setCart([]);

  const handleBoxNowClick = () => {
    setBoxNowLocker("Locker #1245 - BP Λεωφ. Κηφισίας 15");
  };

  return (
    <div className="checkout-wrapper">
      <div className="checkout-header">
        <h1>Ταμείο.</h1>
        <p>Ολοκλήρωση της παραγγελίας σας με ασφάλεια.</p>
      </div>

      <div className="checkout-container">
        <div className="payment-section">
          
          <div className="checkout-block">
            <h3>1. Στοιχεία Επικοινωνίας</h3>
            <div className="form-group">
              <label>Email *</label>
              <input type="email" placeholder="π.χ. maria@example.com" required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Ονοματεπώνυμο *</label>
                <input type="text" placeholder="π.χ. Μαρία Παπαδοπούλου" required />
              </div>
              <div className="form-group">
                <label>Τηλέφωνο (Κινητό) *</label>
                <input type="tel" placeholder="π.χ. 6900000000" required />
              </div>
            </div>
          </div>

        {!hasAppointment ? (
          <div className="checkout-block">
            <h3>2. Αποστολή (Αποκλειστικά μέσω BoxNow)</h3>
            <div className="boxnow-fields">
              <p className="boxnow-instructions">
                Επιλέξτε την κοντινότερη θυρίδα στον χάρτη.
              </p>
              <button type="button" className="boxnow-map-btn" onClick={handleBoxNowClick}>
                🗺️ Επιλογή Θυρίδας στον Χάρτη
              </button>
              {boxNowLocker && (
                <div className="boxnow-selected-locker">
                  ✅ Επιλέξατε: <strong>{boxNowLocker}</strong>
                </div>
              )}
            </div>
          </div>
          ): (
            <div className="checkout-block appointment-info-box">
              <h3>2. Πληροφορίες Κράτησης</h3>
              <p>Η πληρωμή αφορά την επιβεβαίωση του ραντεβού σας.</p>
            </div>
          )}

          <div className="checkout-block">
            <h3>3. Πληρωμή</h3>
            <p className="stripe-info">Ασφαλής συναλλαγή κρυπτογραφημένη μέσω <strong>Stripe</strong></p>
            
            <Elements stripe={stripePromise}>
              {/* Περνάμε το emptyCart ως prop στο PaymentForm */}
              <PaymentForm finalTotal={finalTotal} emptyCart={emptyCart} cart={cart}/>
            </Elements>

          </div>
        </div>

       <div className="summary-section">
          <h3>Σύνοψη Παραγγελίας</h3>
          <div className="summary-items-list">
            {cart && cart.map(item => (
              <div key={item.id} className="summary-item">
                <div className="sum-item-info">
                  <span className="sum-qty">{item.qty} x</span>
                  <span className="sum-name">{item.name}</span>
                </div>
                <span className="sum-price">{(item.price * item.qty).toFixed(2)}€</span>
              </div>
            ))}
          </div>
          <div className="summary-divider"></div>
          <div className="summary-costs">
            <div className="cost-row"><span>Αξία Προϊόντων</span><span>{cartSubtotal.toFixed(2)}€</span></div>
            <div className="cost-row"><span>Μεταφορικά</span><span>{shippingCost.toFixed(2)}€</span></div>
          </div>
          <div className="summary-divider"></div>
          <div className="summary-total"><span>Τελικό Σύνολο</span><span>{finalTotal.toFixed(2)}€</span></div>
        </div>
      </div>
    </div>
  );
}
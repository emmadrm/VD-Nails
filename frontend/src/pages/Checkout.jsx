import React, { useState, useEffect, useRef } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import '../index.css';
import { useNavigate } from 'react-router-dom';

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUB_KEY;
const stripePromise = loadStripe(stripePublishableKey);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const PaymentForm = ({ finalTotal, emptyCart, cart, formData, lockerDataRef }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);

  const loggedInUser = JSON.parse(localStorage.getItem('vd_user'));
  const userId = loggedInUser ? loggedInUser.id : null;

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    if (!stripe || !elements) return; 

    setProcessing(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/create-payment-intent`, {
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
          billing_details: { name: formData.name },
        }
      });

      if (result.error) {
        setError(result.error.message);
      } else if (result.paymentIntent.status === 'succeeded') {
        const stripeId = result.paymentIntent.id;

        // Αποθήκευση της παραγγελίας στη βάση
        await fetch(`${API_URL}/api/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId, 
            client_name: formData.name,
            client_email: formData.email,
            client_phone: formData.phone,
            customer_notes: formData.notes || 'N/A',
            products: cart,
            boxnow_locker: lockerDataRef.current || 'N/A',
            total_amount: finalTotal, 
            stripe_id: stripeId
          })
        });

        emptyCart();
        navigate('/success');
      }
    } catch (err) {
      console.error(err);
      setError('Υπήρξε κάποιο πρόβλημα με τη σύνδεση ή την αποθήκευση στη βάση.');
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
          <span>Έχω διαβάσει και συμφωνώ με τους <a href="/terms" target="_blank">Όρους Χρήσης</a> και την <a href="/privacy" target="_blank">Πολιτική Απορρήτου</a>. *</span>
        </label>
      </div>

      <button type="submit" disabled={!stripe || processing} className="pay-now-btn">
        {processing ? 'Επεξεργασία Πληρωμής...' : `Ολοκλήρωση & Πληρωμή ${finalTotal.toFixed(2)}€`}
      </button>
    </form>
  );
};

const BoxNowWidget = ({ onLockerSelect }) => {

  useEffect(() => {
    window.bxLocalize = window.bxLocalize || {};
    window.bxLocalize['lockerError'] = "Δεν υπάρχει locker με αυτόν τον αριθμό.";

    window._bn_map_widget_config = {
      autoclose: false,
      autoshow: true,
      partnerId: 2255, 
      islands: "yes",
      size: 1,
      parentElement: "#boxnowmap",
      afterSelect: function(selected) {
        onLockerSelect(selected);
      }
    };

    if (!document.getElementById("boxnow-script-v5")) {
      const script = document.createElement("script");
      script.id = "boxnow-script-v5";
      script.src = "https://widget-cdn.boxnow.gr/map-widget/client/v5.js";
      script.async = true;
      document.body.appendChild(script);
    }

    return () => {
    };
    
  }, [onLockerSelect]);

  return (
    <div 
      id="boxnowmap" 
      style={{ height: '600px', width: '100%', borderRadius: '12px', border: '1px solid #f1ece8', overflow: 'hidden' }}
    ></div>
  );
};

export default function Checkout({ cart, setCart }) {
  const loggedInUser = JSON.parse(localStorage.getItem('vd_user'));

  const [step, setStep] = useState(1); 
  const [formData, setFormData] = useState({ 
    email: loggedInUser ? loggedInUser.email : '', 
    name: loggedInUser ? loggedInUser.name : '', 
    phone: loggedInUser ? loggedInUser.phone : '',
    notes: ''
  });

  const [contactErrors, setContactErrors] = useState({}); 
  
  const lockerDataRef = useRef(null);
  const [hasSelectedLocker, setHasSelectedLocker] = useState(false);

  // Υπολογισμός Κόστους
  const cartSubtotal = cart ? cart.reduce((total, item) => total + (item.price * item.qty), 0) : 0;
  
  // Δωρεάν μεταφορικά αν το καλάθι είναι πάνω από 39€, αλλιώς 2€
  const shippingCost = cartSubtotal >= 39 ? 0 : 2.00; 
  const finalTotal = cartSubtotal + shippingCost;

  const emptyCart = () => {
    setCart([]);
    localStorage.removeItem('vd_nails_cart');
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    
    const newErrors = {};
    if (formData.name.trim().split(/\s+/).length < 2) {
      newErrors.name = 'Παρακαλώ συμπληρώστε πλήρες ονοματεπώνυμο.';
    }
    if (!/^\d{10}$/.test(formData.phone)) {
      newErrors.phone = 'Το τηλέφωνο πρέπει να έχει ακριβώς 10 ψηφία.';
    }

    if (Object.keys(newErrors).length > 0) {
      setContactErrors(newErrors);
      return;
    }

    setContactErrors({}); 
    setStep(2); // Πάει κατευθείαν στο BoxNow
  };

  const handleLockerSelect = (selected) => {
    lockerDataRef.current = `Locker #${selected.boxnowLockerId} - ${selected.boxnowLockerAddressLine1}, ${selected.boxnowLockerPostalCode}`;
    
    const resDiv = document.getElementById('locker-result');
    const idSpan = document.getElementById('locker-id');
    const addrSpan = document.getElementById('locker-address');
    const zipSpan = document.getElementById('locker-zip');

    if (resDiv) resDiv.style.display = 'block';
    if (idSpan) idSpan.innerText = selected.boxnowLockerId;
    if (addrSpan) addrSpan.innerText = selected.boxnowLockerAddressLine1;
    if (zipSpan) zipSpan.innerText = selected.boxnowLockerPostalCode;

    setHasSelectedLocker(true);
    setStep(3);
  };

  return (
    <div className="checkout-wrapper">
      <div className="checkout-header">
        <h1>Ταμείο.</h1>
        <p>Ολοκλήρωση της παραγγελίας σας με ασφάλεια.</p>
      </div>

      <div className="checkout-container">
        <div className="payment-section">
          
         {/* ΒΗΜΑ 1: Στοιχεία */}
          <div className="checkout-block">
            <h3>1. Στοιχεία Επικοινωνίας</h3>
            <form onSubmit={handleContactSubmit}>
              
              <div className="form-group">
                <label>Email *</label>
                <input 
                  type="email" 
                  name="email"
                  autoComplete="email" 
                  placeholder="maria@example.com" 
                  required 
                  disabled={step > 1} 
                  value={formData.email} 
                  onChange={(e) => setFormData({...formData, email: e.target.value})} 
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Ονοματεπώνυμο *</label>
                  <input 
                    type="text" 
                    name="name"
                    autoComplete="name" 
                    placeholder="Μαρία Παπαδοπούλου" 
                    required 
                    disabled={step > 1} 
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  />
                  {contactErrors.name && <p style={{color: '#ef4444', fontSize: '0.85rem', marginTop: '5px', margin: '0'}}>{contactErrors.name}</p>}
                </div>
                
                <div className="form-group">
                  <label>Τηλέφωνο *</label>
                  <input 
                    type="tel" 
                    name="phone"
                    autoComplete="tel" 
                    placeholder="69........" 
                    required 
                    disabled={step > 1} 
                    value={formData.phone} 
                    onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                  />
                  {contactErrors.phone && <p style={{color: '#ef4444', fontSize: '0.85rem', marginTop: '5px', margin: '0'}}>{contactErrors.phone}</p>}
                </div>
              </div>

              <div className="form-group">
                <label>Σχόλια Παραγγελίας</label>
                <textarea 
                  value={formData.notes} 
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  disabled={step > 1}
                  placeholder="Προσθέστε σχόλια εδώ..."
                  rows="3"
                />
              </div>
              
              {step === 1 && <button type="submit" className="pay-now-btn" style={{ marginTop: '15px' }}>Συνέχεια</button>}
            </form>
          </div>

          {/* ΒΗΜΑ 2: Αποστολή BoxNow */}
          {step >= 2 && (
            <div className="checkout-block">
              <h3>2. Αποστολή (Αποκλειστικά μέσω BoxNow)</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
                <BoxNowWidget onLockerSelect={handleLockerSelect} />
                <div className="card card--heigh-auto" id="locker-result" style={{ display: 'none', padding: '20px', background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                  <h2 className="h3">Locker : <span id="locker-id">--</span></h2>
                  <p className="blue"><span id="locker-address">--</span>, <span id="locker-zip">--</span></p>
                  <div style={{ marginTop: '15px', color: '#10b981', fontWeight: '600' }}>✅ Επιλέχθηκε επιτυχώς!</div>
                </div>
              </div>
            </div>
          )}

          {/* ΒΗΜΑ 3: Πληρωμή Stripe */}
          {step === 3 && hasSelectedLocker && (
            <div className="checkout-block">
              <h3>3. Πληρωμή</h3>
              <p className="stripe-info">Ασφαλής συναλλαγή κρυπτογραφημένη μέσω <strong>Stripe</strong></p>
              <Elements stripe={stripePromise}>
                <PaymentForm finalTotal={finalTotal} emptyCart={emptyCart} cart={cart} formData={formData} lockerDataRef={lockerDataRef}/>
              </Elements>
            </div>
          )}

        </div>

        <div className="summary-section">
          <h3>Σύνοψη Παραγγελίας</h3>
          <div className="summary-items-list">
            {cart && cart.map((item, index) => (
              <div key={item.id || index} className="summary-item">
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
            <div className="cost-row"><span>Αξία Καλαθιού</span><span>{cartSubtotal.toFixed(2)}€</span></div>
            <div className="cost-row">
              <span>Μεταφορικά (BoxNow)</span>
              {shippingCost === 0 ? (
                <span style={{ color: '#10b981', fontWeight: 'bold' }}>Δωρεάν</span>
              ) : (
                <span>{shippingCost.toFixed(2)}€</span>
              )}
            </div>
          </div>
          <div className="summary-divider"></div>
          <div className="summary-total"><span>Τελικό Σύνολο</span><span>{finalTotal.toFixed(2)}€</span></div>
        </div>
      </div>
    </div>
  );
}
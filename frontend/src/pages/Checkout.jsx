import React, { useState } from 'react';
import '../index.css';
import { Link } from 'react-router-dom';

function Checkout() {
  // Χρειαζόμαστε μόνο το state για τη θυρίδα του BoxNow
  const [boxNowLocker, setBoxNowLocker] = useState(null);

  // Εικονικά δεδομένα καλαθιού
  const cartSubtotal = 26.50;
  
  // Το κόστος είναι σταθερό αφού έχουμε μόνο BoxNow
  const shippingCost = 2.00;
  const finalTotal = cartSubtotal + shippingCost;

  // Εικονική λειτουργία ανοίγματος χάρτη BoxNow
  const handleBoxNowClick = () => {
    // Εδώ στο μέλλον θα ανοίγει το αληθινό widget της BoxNow. 
    setBoxNowLocker("Locker #1245 - BP Λεωφ. Κηφισίας 15");
  };

  return (
    <div className="checkout-wrapper">
      
      <div className="checkout-header">
        <h1>Ταμείο.</h1>
        <p>Ολοκλήρωση της παραγγελίας σας με ασφάλεια.</p>
      </div>

      <div className="checkout-container">
        
        {/* Αριστερή Στήλη: Φόρμα */}
        <div className="payment-section">
          
          {/* 1. Στοιχεία Επικοινωνίας */}
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

          {/* 2. Αποστολή (Μόνο BoxNow) */}
          <div className="checkout-block">
            <h3>2. Αποστολή (Αποκλειστικά μέσω BoxNow)</h3>
            
            <div className="boxnow-fields">
              <p className="boxnow-instructions">
                Η αποστολή των προϊόντων μας γίνεται <strong>αποκλειστικά μέσω BoxNow</strong> για να παραλαμβάνετε γρήγορα, 24/7, τη στιγμή που σας εξυπηρετεί! Επιλέξτε την κοντινότερη θυρίδα στον χάρτη.
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

            {/* Μετέφερα εδώ τα σχόλια, κάτω από την επιλογή θυρίδας */}
            <div className="form-group" style={{ marginTop: '20px' }}>
              <label>Σχόλια Παραγγελίας (Προαιρετικό)</label>
              <textarea placeholder="Αφήστε μας ένα μήνυμα αν χρειάζεται..." rows="3"></textarea>
            </div>
          </div>

          {/* 3. Πληρωμή */}
          <div className="checkout-block">
            <h3>3. Πληρωμή</h3>
            <p className="stripe-info">Ασφαλής συναλλαγή κρυπτογραφημένη μέσω <strong>Stripe</strong></p>
            
            <div className="mock-stripe-container">
              <div className="form-group">
                <label>Στοιχεία Κάρτας</label>
                <div className="card-inputs-wrapper">
                  <input type="text" className="card-number" placeholder="0000 0000 0000 0000" maxLength="19" />
                  <input type="text" className="card-expiry" placeholder="MM/YY" maxLength="5" />
                  <input type="text" className="card-cvc" placeholder="CVC" maxLength="3" />
                </div>
              </div>
            </div>

            <div className="terms-checkbox">
              <label>
                <input type="checkbox" required />
                <span>Έχω διαβάσει και συμφωνώ με τους <Link to="/terms" target="_blank">Όρους Χρήσης</Link> και την <Link to="/privacy" target="_blank">Πολιτική Απορρήτου</Link>. *</span>
              </label>
            </div>

            <button type="button" className="pay-now-btn">
              Ολοκλήρωση & Πληρωμή {finalTotal.toFixed(2)}€
            </button>
          </div>

        </div>

        {/* Δεξιά Στήλη: Σύνοψη */}
        <div className="summary-section">
          <h3>Σύνοψη Παραγγελίας</h3>
          
          <div className="summary-items-list">
            <div className="summary-item">
              <div className="sum-item-info">
                <span className="sum-qty">1 x</span>
                <span className="sum-name">Almond Cuticle Oil</span>
              </div>
              <span className="sum-price">8.50€</span>
            </div>
            
            <div className="summary-item">
              <div className="sum-item-info">
                <span className="sum-qty">1 x</span>
                <span className="sum-name">Luxury Hand Cream</span>
              </div>
              <span className="sum-price">18.00€</span>
            </div>
          </div>

          <div className="summary-divider"></div>
          
          <div className="summary-costs">
            <div className="cost-row">
              <span>Αξία Προϊόντων</span>
              <span>{cartSubtotal.toFixed(2)}€</span>
            </div>
            <div className="cost-row">
              <span>Μεταφορικά (BoxNow)</span>
              <span>{shippingCost.toFixed(2)}€</span>
            </div>
          </div>

          <div className="summary-divider"></div>
          
          <div className="summary-total">
            <span>Τελικό Σύνολο</span>
            <span>{finalTotal.toFixed(2)}€</span>
          </div>

          <div className="secure-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            256-bit SSL Encryption
          </div>
        </div>

      </div>
    </div>
  );
}

export default Checkout;
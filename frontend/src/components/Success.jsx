import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../index.css';

export default function Success() {
  const location = useLocation();
  // Παίρνουμε την πληροφορία από το state που στείλαμε (από το Checkout ή το Booking)
  const isAppointment = location.state?.isAppointment || false;

  return (
    <div className="success-wrapper">
      <div className="success-card">
        <div className="success-icon-container">
          <div className="success-checkmark">
            <svg viewBox="0 0 52 52">
              <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
              <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
            </svg>
          </div>
        </div>

        <h1 className="success-title">
          {isAppointment ? 'Ευχαριστούμε!' : 'Ευχαριστούμε!'}
        </h1>
        
        <p className="success-message">
          {isAppointment 
            ? "Η κράτησή σας ολοκληρώθηκε με επιτυχία." 
            : "Η παραγγελία σας ολοκληρώθηκε με επιτυχία."}
        </p>
        
        <div className="success-details">
          {isAppointment ? (
            <p>
              Θα λάβετε σύντομα ένα <strong>email επιβεβαίωσης</strong> με τις λεπτομέρειες του ραντεβού σας και τις οδηγίες για την επίσκεψή σας. Ανυπομονούμε να σας δούμε!
            </p>
          ) : (
            <p>
              Θα λάβετε σύντομα ένα email επιβεβαίωσης με τις λεπτομέρειες της αποστολής σας μέσω <strong>BoxNow</strong>.
            </p>
          )}
        </div>

        <div className="success-actions">
          <Link to="/" className="success-home-btn">
            {isAppointment ? "Επιστροφή στην Αρχική" : "Επιστροφή στο Κατάστημα"}
          </Link>
        </div>
      </div>
    </div>
  );
}
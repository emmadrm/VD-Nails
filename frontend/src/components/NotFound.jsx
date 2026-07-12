import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '100px 20px' }}>
      <h1>404</h1>
      <p>Ουπς! Η σελίδα που ψάχνετε δεν υπάρχει.</p>
      <Link to="/" className="pay-now-btn">Επιστροφή στην Αρχική</Link>
    </div>
  );
}
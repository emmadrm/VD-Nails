import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../index.css';

export default function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true); // Εναλλαγή μεταξύ Σύνδεσης & Εγγραφής
  const [error, setError] = useState(null);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', password: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const url = isLogin ? `${API_URL}/api/login` : `${API_URL}/api/register`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();

      if (res.ok) {
        // Επιτυχία: Αποθηκεύουμε τον χρήστη και τον πάμε στο προφίλ του!
        localStorage.setItem('vd_user', JSON.stringify(data.user));
        navigate('/profile');
        window.location.reload(); // Ανανέωση για να ενημερωθεί το Header
      } else {
        // Σφάλμα (π.χ. λάθος κωδικός ή το email υπάρχει ήδη)
        setError(data.error);
      }
    } catch (err) {
      setError('Υπήρξε κάποιο πρόβλημα με τον server. Προσπαθήστε ξανά.');
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
      <div className="card shadow-sm" style={{ width: '100%', maxWidth: '400px', padding: '30px', borderRadius: '15px', border: 'none' }}>
        <h2 className="text-center mb-4" style={{ color: '#3b2b1f' }}>
          {isLogin ? 'Σύνδεση' : 'Δημιουργία Λογαριασμού'}
        </h2>

        {error && <div className="alert alert-danger p-2 text-center" style={{ fontSize: '0.9rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          {!isLogin && (
            <>
              <input type="text" name="name" className="form-control" placeholder="Ονοματεπώνυμο *" required value={formData.name} onChange={handleChange} />
              <input type="tel" name="phone" className="form-control" placeholder="Τηλέφωνο *" required value={formData.phone} onChange={handleChange} />
            </>
          )}
          
          <input type="email" name="email" className="form-control" placeholder="Email *" required value={formData.email} onChange={handleChange} />
          
          <input type="password" name="password" className="form-control" placeholder="Κωδικός *" required value={formData.password} onChange={handleChange} />

          <button type="submit" className="btn w-100 fw-bold mt-2" style={{ backgroundColor: '#3b2b1f', color: '#fff' }}>
            {isLogin ? 'Σύνδεση' : 'Εγγραφή'}
          </button>
        </form>

        <div className="text-center mt-4" style={{ fontSize: '0.9rem' }}>
          {isLogin ? 'Δεν έχετε λογαριασμό; ' : 'Έχετε ήδη λογαριασμό; '}
          <span 
            onClick={() => { setIsLogin(!isLogin); setError(null); }} 
            style={{ color: '#8c7a6b', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline' }}
          >
            {isLogin ? 'Εγγραφείτε εδώ' : 'Συνδεθείτε εδώ'}
          </span>
        </div>
      </div>
    </div>
  );
}
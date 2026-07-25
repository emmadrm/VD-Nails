import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../index.css';

export default function Auth() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(location.state?.mode !== 'register'); // Εναλλαγή μεταξύ Σύνδεσης & Εγγραφής
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
        // Επιτυχία: Αποθηκεύουμε τον χρήστη και τον πάμε εκεί που ήθελε αρχικά (ή στο προφίλ του)
        localStorage.setItem('vd_user', JSON.stringify(data.user));
        navigate(location.state?.from || '/profile');
        window.location.reload(); // Ανανέωση για να ενημερωθεί το Header
      } else {
        // Σφάλμα (π.χ. λάθος κωδικός ή το email υπάρχει ήδη)
        setError(data.error);
      }
    } catch (err) {
      setError(t('auth.errorGeneric'));
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-icon-badge">
          <img src="/logo.png" alt="VD Nails" />
        </div>

        <div className="auth-tabs">
          <button type="button" className={`auth-tab-btn${isLogin ? ' active' : ''}`} onClick={() => { setIsLogin(true); setError(null); }}>
            {t('auth.login')}
          </button>
          <button type="button" className={`auth-tab-btn${!isLogin ? ' active' : ''}`} onClick={() => { setIsLogin(false); setError(null); }}>
            {t('auth.register')}
          </button>
        </div>

        <h2 className="text-center mb-4" style={{ color: '#3b2b1f', fontFamily: "'Instrument Serif', serif", fontSize: '2rem' }}>
          {isLogin ? t('auth.welcome') : t('auth.createAccount')}
        </h2>

        {error && <div className="alert alert-danger p-2 text-center" style={{ fontSize: '0.9rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

          {!isLogin && (
            <>
              <input type="text" name="name" className="form-control vd-input" placeholder={t('auth.namePlaceholder')} required value={formData.name} onChange={handleChange} />
              <input type="tel" name="phone" className="form-control vd-input" placeholder={t('auth.phonePlaceholder')} required value={formData.phone} onChange={handleChange} />
            </>
          )}

          <input type="email" name="email" className="form-control vd-input" placeholder={t('auth.emailPlaceholder')} required value={formData.email} onChange={handleChange} />

          <input type="password" name="password" className="form-control vd-input" placeholder={t('auth.passwordPlaceholder')} required value={formData.password} onChange={handleChange} />

          <button type="submit" className="pay-now-btn" style={{ marginTop: '5px' }}>
            {isLogin ? t('auth.login') : t('auth.register')}
          </button>
        </form>
      </div>
    </div>
  );
}
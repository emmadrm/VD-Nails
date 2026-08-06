import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../index.css';

export default function ResetPassword() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const token = searchParams.get('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (password !== confirmPassword) {
      setError(t('auth.passwordsMustMatch'));
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage(data.message);
        setTimeout(() => navigate('/login'), 2500);
      } else {
        setError(data.error || t('auth.errorGeneric'));
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

        <h2 className="text-center mb-4" style={{ color: '#3b2b1f', fontFamily: "'Instrument Serif', serif", fontSize: '2rem' }}>
          {t('auth.resetPasswordTitle')}
        </h2>

        {message && <div className="alert alert-success p-2 text-center" style={{ fontSize: '0.95rem' }}>{message}</div>}
        {error && <div className="alert alert-danger p-2 text-center" style={{ fontSize: '0.95rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input
            type="password"
            name="password"
            className="form-control vd-input"
            placeholder={t('auth.newPasswordPlaceholder')}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <input
            type="password"
            name="confirmPassword"
            className="form-control vd-input"
            placeholder={t('auth.confirmPasswordPlaceholder')}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <button type="submit" className="pay-now-btn" style={{ marginTop: '5px' }}>
            {t('auth.resetPassword')}
          </button>
        </form>
      </div>
    </div>
  );
}

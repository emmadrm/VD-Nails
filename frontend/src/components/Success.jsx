import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../index.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 15;

export default function Success({ setCart }) {
  const { t } = useTranslation();
  const location = useLocation();

  // Όταν ο πελάτης επιστρέφει από ανακατεύθυνση πληρωμής (τράπεζα, wallet κ.λπ.), το Stripe προσθέτει ?payment_intent=pi_...
  const paymentIntentId = new URLSearchParams(location.search).get('payment_intent');
  const [check, setCheck] = useState(paymentIntentId ? { state: 'checking' } : null);

  useEffect(() => {
    if (!paymentIntentId) return;
    let cancelled = false;
    let polls = 0;

    const poll = async () => {
      polls += 1;
      try {
        const res = await fetch(`${API_URL}/api/checkout/status/${encodeURIComponent(paymentIntentId)}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) { setCheck({ state: 'failed', error: data.error }); return; }
        if (data.state === 'completed') {
          if (data.type === 'order' && setCart) {
            setCart([]);
            localStorage.removeItem('vd_nails_cart');
          }
          setCheck(data);
          return;
        }
        if (data.state === 'failed') { setCheck(data); return; }
        // 'processing': η τράπεζα δεν έχει ολοκληρώσει ακόμα — ξαναρωτάμε σε λίγο
        if (polls >= MAX_POLLS) { setCheck({ state: 'processing', type: data.type }); return; }
        setCheck({ state: 'checking', type: data.type });
        setTimeout(poll, POLL_INTERVAL_MS);
      } catch {
        if (cancelled) return;
        if (polls >= MAX_POLLS) { setCheck({ state: 'processing' }); return; }
        setTimeout(poll, POLL_INTERVAL_MS);
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [paymentIntentId, setCart]);

  const isAppointment = check?.type ? check.type === 'appointment' : (location.state?.isAppointment || false);

  if (check && check.state !== 'completed') {
    const isFailed = check.state === 'failed';
    return (
      <div className="success-wrapper">
        <div className="success-card">
          <h1 className="success-title">
            {check.state === 'checking' ? t('success.checkingTitle') : isFailed ? t('success.failedTitle') : t('success.processingTitle')}
          </h1>
          <p className="success-message">
            {check.state === 'checking' ? t('success.checkingMsg') : isFailed ? (check.error || t('success.failedMsg')) : t('success.processingMsg')}
          </p>
          {check.state !== 'checking' && (
            <div className="success-actions">
              <Link to={isAppointment ? '/booking' : '/checkout'} className="success-home-btn">
                {isFailed ? t('success.tryAgain') : t('success.backHome')}
              </Link>
              <Link to="/" className="success-secondary-link">{t('success.backHome')}</Link>
            </div>
          )}
        </div>
      </div>
    );
  }

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
          {t('success.thankYou')}
        </h1>

        <p className="success-message">
          {isAppointment ? t('success.appointmentMsg') : t('success.orderMsg')}
        </p>

        <div className="success-details">
          <p>{isAppointment ? t('success.appointmentDetails') : t('success.orderDetails')}</p>
        </div>

        <div className="success-actions">
          <Link to="/" className="success-home-btn">
            {isAppointment ? t('success.backHome') : t('success.backShop')}
          </Link>
          <Link to="/profile" className="success-secondary-link">{t('success.viewProfile')}</Link>
        </div>
      </div>
    </div>
  );
}

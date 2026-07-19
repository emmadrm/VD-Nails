import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../index.css';

export default function Success() {
  const { t } = useTranslation();
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
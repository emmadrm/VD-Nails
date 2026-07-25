import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../index.css';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="not-found-wrapper">
      <img src="/logo.png" alt="VD Nails" className="not-found-icon" />
      <h1 className="not-found-code">404</h1>
      <p className="not-found-message">{t('notFound.message')}</p>
      <Link to="/" className="mirror-button header-booking-btn">{t('notFound.backHome')}</Link>
    </div>
  );
}
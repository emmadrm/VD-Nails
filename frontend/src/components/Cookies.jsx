import React from "react";
import { useTranslation } from 'react-i18next';
import '../index.css';

function Cookies() {
    const { t } = useTranslation();
    return (
    <div className="legal-page">

      <h1>{t('legal.cookies.title')}</h1>
      <p className="legal-page-updated">
        <strong>{t('legal.lastUpdated')}</strong>
      </p>

      <div className="legal-card">

        <p dangerouslySetInnerHTML={{ __html: t('legal.cookies.intro') }} />

        <h3>{t('legal.cookies.s1Title')}</h3>
        <p>{t('legal.cookies.s1Body')}</p>

        <h3>{t('legal.cookies.s2Title')}</h3>

        <h5 style={{ color: '#10b981', marginTop: '20px' }}>{t('legal.cookies.s2ATitle')} - <em>{t('legal.cookies.s2AState')}</em></h5>
        <p>{t('legal.cookies.s2ABody')}</p>
        <ul>
          <li style={{ marginBottom: '8px' }} dangerouslySetInnerHTML={{ __html: t('legal.cookies.s2ALi1') }} />
          <li style={{ marginBottom: '8px' }} dangerouslySetInnerHTML={{ __html: t('legal.cookies.s2ALi2') }} />
          <li style={{ marginBottom: '8px' }} dangerouslySetInnerHTML={{ __html: t('legal.cookies.s2ALi3') }} />
        </ul>

        <h5 style={{ color: '#10b981', marginTop: '20px' }}>{t('legal.cookies.s2BTitle')} - <em>{t('legal.cookies.s2BState')}</em></h5>
        <p>{t('legal.cookies.s2BBody')}</p>

        <h5 style={{ color: '#10b981', marginTop: '20px' }}>{t('legal.cookies.s2CTitle')} - <em>{t('legal.cookies.s2CState')}</em></h5>
        <p>{t('legal.cookies.s2CBody')}</p>

        <h3>{t('legal.cookies.s3Title')}</h3>
        <p>{t('legal.cookies.s3Body')}</p>

        <h3>{t('legal.cookies.s4Title')}</h3>
        <p dangerouslySetInnerHTML={{ __html: t('legal.cookies.s4Body') }} />
      </div>
    </div>
    );
}

export default Cookies;

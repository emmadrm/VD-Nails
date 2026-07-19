import React from "react";
import { useTranslation } from 'react-i18next';
import '../index.css';

function Deliveries() {
    const { t } = useTranslation();
    return (
        <div className="legal-page">

      <h1>{t('legal.shipping.title')}</h1>
      <p className="legal-page-updated">
        <strong>{t('legal.lastUpdated')}</strong>
      </p>

      <div className="legal-card">

        <p dangerouslySetInnerHTML={{ __html: t('legal.shipping.intro') }} />

        <h3>{t('legal.shipping.s1Title')}</h3>
        <p>{t('legal.shipping.s1Body')}</p>
        <ul>
          <li style={{ marginBottom: '8px' }} dangerouslySetInnerHTML={{ __html: t('legal.shipping.s1Li1') }} />
          <li style={{ marginBottom: '8px' }} dangerouslySetInnerHTML={{ __html: t('legal.shipping.s1Li2') }} />
        </ul>

        <h3>{t('legal.shipping.s2Title')}</h3>
        <p>{t('legal.shipping.s2Body')}</p>
        <ul>
          <li style={{ marginBottom: '8px' }} dangerouslySetInnerHTML={{ __html: t('legal.shipping.s2Li1') }} />
        </ul>

        <h3>{t('legal.shipping.s3Title')}</h3>
        <p dangerouslySetInnerHTML={{ __html: t('legal.shipping.s3Body') }} />

        <h3>{t('legal.shipping.s4Title')}</h3>
        <p>{t('legal.shipping.s4Body')}</p>
      </div>
    </div>
    );
}

export default Deliveries;

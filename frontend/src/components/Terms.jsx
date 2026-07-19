import React from "react";
import { useTranslation } from 'react-i18next';
import '../index.css';

function Terms() {
    const { t } = useTranslation();
    return (
        <div className="legal-page">

      <h1>{t('legal.terms.title')}</h1>
      <p className="legal-page-updated">
        <strong>{t('legal.lastUpdated')}</strong>
      </p>

      <div className="legal-card">

        <p dangerouslySetInnerHTML={{ __html: t('legal.terms.intro') }} />

        <h3>{t('legal.terms.s1Title')}</h3>
        <p>{t('legal.terms.s1Body')}</p>

        <h3>{t('legal.terms.s2Title')}</h3>
        <p>{t('legal.terms.s2Body')}</p>
        <ul>
          <li style={{ marginBottom: '8px' }}>{t('legal.terms.s2Li1')}</li>
          <li style={{ marginBottom: '8px' }}>{t('legal.terms.s2Li2')}</li>
        </ul>

        <h3>{t('legal.terms.s3Title')}</h3>
        <p>{t('legal.terms.s3Body')}</p>
        <ul>
          <li style={{ marginBottom: '8px' }}>{t('legal.terms.s3Li1')}</li>
          <li style={{ marginBottom: '8px' }}>{t('legal.terms.s3Li2')}</li>
        </ul>

        <h3>{t('legal.terms.s4Title')}</h3>
        <p>{t('legal.terms.s4Body')}</p>
        <ul>
          <li style={{ marginBottom: '8px' }}>{t('legal.terms.s4Li1')}</li>
          <li style={{ marginBottom: '8px' }}>{t('legal.terms.s4Li2')}</li>
        </ul>

        <h3>{t('legal.terms.s5Title')}</h3>
        <p dangerouslySetInnerHTML={{ __html: t('legal.terms.s5Body') }} />

        <h3>{t('legal.terms.s6Title')}</h3>
        <p>{t('legal.terms.s6Body')}</p>

        <h3>{t('legal.terms.s7Title')}</h3>
        <p dangerouslySetInnerHTML={{ __html: t('legal.terms.s7Body') }} />

      </div>
    </div>
    );
}

export default Terms;

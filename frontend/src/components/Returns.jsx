import React from "react";
import { useTranslation } from 'react-i18next';
import '../index.css';

function Returns() {
    const { t } = useTranslation();
    return (
        <div className="legal-page">

      <h1>{t('legal.returns.title')}</h1>
      <p className="legal-page-updated">
        <strong>{t('legal.lastUpdated')}</strong>
      </p>

      <div className="legal-card">

        <p>{t('legal.returns.intro')}</p>

        <h3>{t('legal.returns.s1Title')}</h3>
        <p dangerouslySetInnerHTML={{ __html: t('legal.returns.s1Body') }} />
        <p dangerouslySetInnerHTML={{ __html: t('legal.returns.s1Cond') }} />
        <ul>
          <li style={{ marginBottom: '8px' }}>{t('legal.returns.s1Li1')}</li>
          <li style={{ marginBottom: '8px' }} dangerouslySetInnerHTML={{ __html: t('legal.returns.s1Li2') }} />
          <li style={{ marginBottom: '8px' }}>{t('legal.returns.s1Li3')}</li>
        </ul>
        <p style={{ fontSize: '0.9rem', color: '#666' }}><em>{t('legal.returns.s1Note')}</em></p>

        <h3>{t('legal.returns.s2Title')}</h3>
        <p dangerouslySetInnerHTML={{ __html: t('legal.returns.s2Body') }} />
        <ul>
          <li style={{ marginBottom: '8px' }}>{t('legal.returns.s2Li1')}</li>
          <li style={{ marginBottom: '8px' }}>{t('legal.returns.s2Li2')}</li>
          <li style={{ marginBottom: '8px' }}>{t('legal.returns.s2Li3')}</li>
        </ul>

        <h3>{t('legal.returns.s3Title')}</h3>
        <p>{t('legal.returns.s3Body')}</p>
        <ul>
          <li style={{ marginBottom: '8px' }} dangerouslySetInnerHTML={{ __html: t('legal.returns.s3Li1') }} />
          <li style={{ marginBottom: '8px' }} dangerouslySetInnerHTML={{ __html: t('legal.returns.s3Li2') }} />
          <li style={{ marginBottom: '8px' }} dangerouslySetInnerHTML={{ __html: t('legal.returns.s3Li3') }} />
        </ul>

        <h3>{t('legal.returns.s4Title')}</h3>
        <p dangerouslySetInnerHTML={{ __html: t('legal.returns.s4Body') }} />

        <h3>{t('legal.returns.s5Title')}</h3>
        <p dangerouslySetInnerHTML={{ __html: t('legal.returns.s5Body') }} />

      </div>
    </div>
    );
}

export default Returns;

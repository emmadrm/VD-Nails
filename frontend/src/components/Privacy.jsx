import React from "react";
import { useTranslation } from 'react-i18next';
import '../index.css';

function Privacy() {
    const { t } = useTranslation();
    return (
        <div className="legal-page">

      <h1>{t('legal.privacy.title')}</h1>
      <p className="legal-page-updated">
        <strong>{t('legal.lastUpdated')}</strong>
      </p>

      <div className="legal-card">

        <p dangerouslySetInnerHTML={{ __html: t('legal.privacy.intro') }} />

        <h3>{t('legal.privacy.s1Title')}</h3>
        <p>{t('legal.privacy.s1Body')}</p>
        <ul>
          <li dangerouslySetInnerHTML={{ __html: t('legal.privacy.s1Li1') }} />
          <li dangerouslySetInnerHTML={{ __html: t('legal.privacy.s1Li2') }} />
          <li dangerouslySetInnerHTML={{ __html: t('legal.privacy.s1Li3') }} />
        </ul>

        <h3>{t('legal.privacy.s2Title')}</h3>
        <p>{t('legal.privacy.s2Body')}</p>
        <ul>
          <li>{t('legal.privacy.s2Li1')}</li>
          <li>{t('legal.privacy.s2Li2')}</li>
          <li>{t('legal.privacy.s2Li3')}</li>
          <li>{t('legal.privacy.s2Li4')}</li>
        </ul>

        <h3>{t('legal.privacy.s3Title')}</h3>
        <p dangerouslySetInnerHTML={{ __html: t('legal.privacy.s3Body') }} />
        <ul>
          <li dangerouslySetInnerHTML={{ __html: t('legal.privacy.s3Li1') }} />
          <li dangerouslySetInnerHTML={{ __html: t('legal.privacy.s3Li2') }} />
        </ul>

        <h3>{t('legal.privacy.s4Title')}</h3>
        <p>{t('legal.privacy.s4Body')}</p>
        <ul>
          <li dangerouslySetInnerHTML={{ __html: t('legal.privacy.s4Li1') }} />
          <li>{t('legal.privacy.s4Li2')}</li>
          <li dangerouslySetInnerHTML={{ __html: t('legal.privacy.s4Li3') }} />
        </ul>

        <h3>{t('legal.privacy.s5Title')}</h3>
        <p>{t('legal.privacy.s5Body')}</p>

        <h3>{t('legal.privacy.s6Title')}</h3>
        <p dangerouslySetInnerHTML={{ __html: t('legal.privacy.s6Body') }} />
      </div>
    </div>
    );
}

export default Privacy;

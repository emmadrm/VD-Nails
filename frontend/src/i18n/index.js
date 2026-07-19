import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import el from './locales/el.json';
import en from './locales/en.json';

const storedLang = localStorage.getItem('vd_lang');

i18n
  .use(initReactI18next)
  .init({
    resources: {
      el: { translation: el },
      en: { translation: en }
    },
    lng: storedLang || 'el',
    fallbackLng: 'el',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;

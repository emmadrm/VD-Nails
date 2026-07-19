import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import './i18n';
import * as Sentry from "@sentry/react";
Sentry.init({
  dsn: "https://3b52e3ad018e7809b5ae0202563a340b@o4511722591748096.ingest.de.sentry.io/4511722606362704",
  dataCollection: {
    // userInfo: false,
    // httpBodies: []
  },
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration()
  ],
  tracesSampleRate: 1.0, 
  tracePropagationTargets: ["localhost", /^http:\/\/localhost:5001\/api/, /^https:\/\/vdnails\.gr\/api/],
  replaysSessionSampleRate: 0.1, 
  replaysOnErrorSampleRate: 1.0, 
  enableLogs: true
});
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
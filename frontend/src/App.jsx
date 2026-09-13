import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';

import './index.css';
import React, { useState, useEffect, Suspense, lazy} from 'react';
import {BrowserRouter , Routes , Route, useLocation} from 'react-router-dom';
import CookieConsent, { getCookieConsentValue } from "react-cookie-consent";
import { useTranslation } from 'react-i18next';
import { initGA, trackPageView, disableGA } from './analytics';

const lazyWithReload = (importer, chunkName) =>
  lazy(async () => {
    const reloadKey = `vdnails_chunk_reload_${chunkName}`;

    try {
      const module = await importer();

      // Chunk φορτώθηκε κανονικά, άρα καθαρίζουμε τυχόν προηγούμενο flag.
      sessionStorage.removeItem(reloadKey);

      return module;
    } catch (error) {
       const message = error instanceof Error ? error.message : String(error);

      const isChunkError =
        message.includes('Failed to fetch dynamically imported module') ||
        message.includes('Importing a module script failed') ||
        message.includes('ChunkLoadError') ||
        message.includes('Loading chunk');

      // Do not reload for unrelated application/import errors.
      if (!isChunkError) {
        throw error;
      }
      const alreadyReloaded = sessionStorage.getItem(reloadKey);

      if (!alreadyReloaded) {
        console.warn(
          `[VD Nails] Failed to load ${chunkName} chunk. Reloading page...`,
          error
        );

        sessionStorage.setItem(reloadKey, 'true');

        window.location.reload();

        // Περιμένουμε το reload.
        return new Promise(() => {});
      }

      // Αν αποτύχει και μετά το reload, δεν κάνουμε infinite reload loop.
      sessionStorage.removeItem(reloadKey);

      throw error;
    }
  });

const Home = lazyWithReload(() => import('./pages/Home.jsx'), 'Home');
const Services = lazyWithReload(() => import('./pages/Services.jsx'), 'Services');
const Eshop = lazyWithReload(() => import('./pages/E-shop.jsx'), 'Eshop');
const Contact = lazyWithReload(() => import('./pages/Contact.jsx'), 'Contact');
const Booking = lazyWithReload(() => import('./pages/Booking.jsx'), 'Booking');
const Checkout = lazyWithReload(() => import('./pages/Checkout.jsx'), 'Checkout');
const Terms = lazyWithReload(() => import('./components/Terms.jsx'), 'Terms');
const Privacy = lazyWithReload(() => import('./components/Privacy.jsx'), 'Privacy');
const Cookies = lazyWithReload(() => import('./components/Cookies.jsx'), 'Cookies');
const Shipping = lazyWithReload(() => import('./components/Shipping.jsx'), 'Shipping');
const Returns = lazyWithReload(() => import('./components/Returns.jsx'), 'Returns');
const Success = lazyWithReload(() => import('./components/Success.jsx'), 'Success');
const Admin = lazyWithReload(() => import('./pages/Admin.jsx'), 'Admin');
const Profile = lazyWithReload(() => import('./pages/Profile.jsx'), 'Profile');
const Auth = lazyWithReload(() => import('./components/Auth.jsx'), 'Auth');
const ForgotPassword = lazyWithReload(() => import('./components/ForgotPassword.jsx'), 'ForgotPassword');
const ResetPassword = lazyWithReload(() => import('./components/ResetPassword.jsx'), 'ResetPassword');
const ServiceDetails = lazyWithReload(() => import('./pages/ServiceDetails.jsx'), 'ServiceDetails');
const AdminLogin = lazyWithReload(() => import('./components/AdminLogin.jsx'), 'AdminLogin');
const NotFound = lazyWithReload(() => import('./components/NotFound.jsx'), 'NotFound');

const GDPR_COOKIE_NAME = 'vdnails_gdpr_consent';

function PageLoader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
      <div style={{ width: '36px', height: '36px', border: '3px solid #e5e7eb', borderTopColor: '#10b981', borderRadius: '50%', animation: 'vd-spin 0.8s linear infinite' }} />
      <style>{`@keyframes vd-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
    trackPageView(pathname + search);
  }, [pathname, search]);

  return null;
}

function CookieGate() {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  const hideCookieModal = pathname === '/privacy' || pathname === '/terms' || pathname === '/cookies';

  if (hideCookieModal) return null;

  return (
    <CookieConsent
      location="none"
      overlay={true}
      buttonText={t('cookieConsent.accept')}
      declineButtonText={t('cookieConsent.decline')}
      enableDeclineButton
      cookieName={GDPR_COOKIE_NAME}
      onAccept={initGA}
      onDecline={disableGA}
      style={{
        background: "#ffffff",
        color: "#3b2b1f",
        fontSize: "15px",
        borderRadius: "12px",
        maxWidth: "450px",
        position: "fixed",
        top: "0",
        left: "50%",
        transform: "translateX(-50%)",
        boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
        textAlign: "center",
        padding: "20px"
      }}
      overlayStyle={{ background: "rgba(0,0,0,0.7)" }}
      declineButtonStyle={{ background: "#f3f4f6", color: "#495057", fontSize: "14px", fontWeight: "bold", borderRadius: "8px", padding: "10px 20px" }}
      expires={10}
    >
      <h3 style={{ margin: "0 0 10px 0", fontSize: "1.3rem", color: "#3b2b1f" }}>{t('cookieConsent.title')}</h3>
      {t('cookieConsent.text')}{' '}
      <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "#10b981", fontWeight: "bold", textDecoration: "none" }}>{t('cookieConsent.privacyLink')}</a>.
    </CookieConsent>
  );
}

function App() {
  const [cart, setCart] = useState(() => {
    const savedCart = localStorage.getItem('vd_nails_cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });

  useEffect(() => {
    localStorage.setItem('vd_nails_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (getCookieConsentValue(GDPR_COOKIE_NAME) === 'true') {
      initGA();
    }
  }, []);

  return (
    <div>
      <BrowserRouter>
      <ScrollToTop />
      <Header cart={cart} setCart={setCart}/>

      {/* ΝΕΟ ΚΕΝΤΡΙΚΟ ΠΑΡΑΘΥΡΟ ΓΙΑ COOKIES */}
      <CookieGate />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/services" element={<Services />} />
            <Route path="/eshop" element={<Eshop cart={cart} setCart={setCart}/>} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/booking" element={<Booking cart={cart} setCart={setCart} />} />
            <Route path="/checkout" element={<Checkout cart={cart} setCart={setCart}/>} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/cookies" element={<Cookies />} />
            <Route path="/shipping" element={<Shipping />} />
            <Route path="/returns" element={<Returns />} />
            <Route path="/success" element={<Success />} />
            <Route path={`/${import.meta.env.VITE_ADMIN_URL }`} element={<AdminLogin />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/login" element={<Auth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/services/:category" element={<ServiceDetails />} />
            <Route path="*" element={<NotFound />} />
            <Route path="/notfound" element={<NotFound />} />
          </Routes>
        </Suspense>
        <Footer />
      </BrowserRouter>
    </div>
  )
}

export default App

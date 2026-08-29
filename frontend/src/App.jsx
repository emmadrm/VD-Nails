import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';

import './index.css';
import React, {useState, useEffect, Suspense, lazy} from 'react';
import {BrowserRouter , Routes , Route, useLocation} from 'react-router-dom';
import CookieConsent, { getCookieConsentValue } from "react-cookie-consent";
import { useTranslation } from 'react-i18next';
import { initGA, trackPageView, disableGA } from './analytics';

const Home = lazy(() => import('./pages/Home.jsx'));
const Services = lazy(() => import('./pages/Services.jsx'));
const Eshop = lazy(() => import('./pages/E-shop.jsx'));
const Contact = lazy(() => import('./pages/Contact.jsx'));
const Booking = lazy(() => import('./pages/Booking.jsx'));
const Checkout = lazy(() => import('./pages/Checkout.jsx'));
const Terms = lazy(() => import('./components/Terms.jsx'));
const Privacy = lazy(() => import('./components/Privacy.jsx'));
const Cookies = lazy(() => import('./components/Cookies.jsx'));
const Shipping = lazy(() => import('./components/Shipping.jsx'));
const Returns = lazy(() => import('./components/Returns.jsx'));
const Success = lazy(() => import('./components/Success.jsx'));
const Admin = lazy(() => import('./pages/Admin.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const Auth = lazy(() => import('./components/Auth.jsx'));
const ForgotPassword = lazy(() => import('./components/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('./components/ResetPassword.jsx'));
const ServiceDetails = lazy(() => import('./pages/ServiceDetails.jsx'));
const AdminLogin = lazy(() => import('./components/AdminLogin.jsx'));
const NotFound = lazy(() => import('./components/NotFound.jsx'));

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

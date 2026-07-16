import Home from './pages/Home.jsx';
import Services from './pages/Services.jsx';
import Eshop from './pages/E-shop.jsx';
import Contact from './pages/Contact.jsx';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import Booking from './pages/Booking.jsx';
import Checkout from './pages/Checkout.jsx';
import Terms from './components/Terms.jsx';
import Privacy from './components/Privacy.jsx';
import Cookies from './components/Cookies.jsx';
import Shipping from './components/Shipping.jsx';
import Returns from './components/Returns.jsx';
import Success from './components/Success.jsx';
import Admin from './pages/Admin.jsx';
import Profile from './pages/Profile.jsx';
import Auth from './components/Auth.jsx';
import ServiceDetails from './pages/ServiceDetails.jsx';
import AdminLogin from './components/AdminLogin.jsx';
import NotFound from './components/NotFound.jsx';


import './index.css';
import React, {useState, useEffect} from 'react';
import {BrowserRouter , Routes , Route} from 'react-router-dom';
import CookieConsent from "react-cookie-consent";

function App() {
  const [cart, setCart] = useState(() => {
    const savedCart = localStorage.getItem('vd_nails_cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });

  useEffect(() => {
    localStorage.setItem('vd_nails_cart', JSON.stringify(cart));
  }, [cart]);

  const currentPath = window.location.pathname;
  
  const hideCookieModal = currentPath === '/privacy' || currentPath === '/terms' || currentPath === '/cookies';
  
  return (
    <div>
      <BrowserRouter>
      <Header cart={cart} setCart={setCart}/>
      
      {/* ΝΕΟ ΚΕΝΤΡΙΚΟ ΠΑΡΑΘΥΡΟ ΓΙΑ COOKIES */}
     {!hideCookieModal && (
      <CookieConsent
          location="none"
          overlay={true}
          buttonText="Αποδοχή Όλων"
          declineButtonText="Απόρριψη"
          enableDeclineButton
          cookieName="vdnails_gdpr_consent"
          style={{ 
            background: "#ffffff", 
            color: "#3b2b1f", 
            fontSize: "15px", 
            borderRadius: "12px",
            maxWidth: "450px",
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            textAlign: "center",
            padding: "20px"
          }}
          overlayStyle={{ background: "rgba(0,0,0,0.7)" }}
          declineButtonStyle={{ background: "#f3f4f6", color: "#495057", fontSize: "14px", fontWeight: "bold", borderRadius: "8px", padding: "10px 20px" }}
          expires={10} 
        >
          <h3 style={{ margin: "0 0 10px 0", fontSize: "1.3rem", color: "#3b2b1f" }}>🍪 Ρυθμίσεις Cookies</h3>
          Χρησιμοποιούμε cookies για να βελτιώσουμε την εμπειρία σας στο κατάστημά μας. 
          Μπορείτε να δείτε αναλυτικά την <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "#10b981", fontWeight: "bold", textDecoration: "none" }}>Πολιτική Απορρήτου</a> μας.
        </CookieConsent>
      )}
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
          <Route path="/vd-admin-12xE5" element={<AdminLogin />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/services/:category" element={<ServiceDetails />} />
          <Route path="*" element={<NotFound />} />
          <Route path="/notfound" element={<NotFound />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </div>
  )
}

export default App
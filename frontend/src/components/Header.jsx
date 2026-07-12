import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from "react-router-dom";
import VDLogo from '../assets/VD-Logo.png';
import CartSidebar from './CartSidebar'; 
import '../index.css';

function Header({ cart, setCart }) {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('vd_user')));
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const cartItemsCount = cart ? cart.reduce((count, item) => count + item.qty, 0) : 0;

  useEffect(() => {
    const checkUser = () => setUser(JSON.parse(localStorage.getItem('vd_user')));
    window.addEventListener('storage', checkUser); 
    return () => window.removeEventListener('storage', checkUser);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('vd_user');
    setUser(null);
    setShowDropdown(false);
    navigate('/');
  };

  const userAuthContent = (
    <div className="header-auth-section" style={{ position: 'relative' }}>
      {user ? (
        <>
          <button className="pro-header-btn" onClick={() => setShowDropdown(!showDropdown)}>
            <span className="pro-btn-name">{user.name.split(' ')[0]}</span>
            <span className="pro-btn-arrow">▾</span>
          </button>
          
          {showDropdown && (
            <div className="pro-dropdown">
              <div className="pro-dropdown-header">
                <strong>{user.name}</strong>
                <span>{user.email}</span>
              </div>
              <button onClick={() => { setShowDropdown(false); navigate('/profile'); }} className="pro-dropdown-item">
                Το Προφίλ μου
              </button>
              <button onClick={handleLogout} className="pro-dropdown-item text-danger">
                Αποσύνδεση
              </button>
            </div>
          )}
        </>
      ) : (
        <button className="pro-header-btn login-btn" onClick={() => navigate('/login')}>
          Σύνδεση
        </button>
      )}
    </div>
  );

  return (
    <div className="Header"> 
      <header className="py-3 mb-4 border-bottom position-relative">
      
        {/* --- ΕΙΔΙΚΗ ΘΕΣΗ ΓΙΑ ΚΙΝΗΤΑ (Top Right) --- */}
        <div className="d-md-none position-absolute" style={{ top: '15px', right: '15px', zIndex: 100 }}>
          {userAuthContent}
        </div>

        {/* --- Λογότυπο (Ακριβώς όπως το είχες αρχικά) --- */}
        <div className="text-center mb-4">
          <Link to="/" className="d-flex align-items-center justify-content-center text-decoration-none">
            <img src={VDLogo} alt="VD Nails Logo" className="logo-image px-4" />
            <h1 className="mt-3 logo-text">VD Nails</h1>
          </Link>
        </div>

        {/* Γραμμή Μενού & Εικονιδίων */}
        <div className="d-flex justify-content-between align-items-center w-100 px-3 px-md-5">
          
          <div className="d-none d-lg-block" style={{ flex: 1 }}></div>

          {/* Μενού Πλοήγησης */}
          <ul className="d-flex justify-content-center align-items-center gap-3 gap-md-5 premium-menu mx-auto mb-0 ps-0" style={{ listStyle: 'none', flexWrap: 'wrap' }}>
            <li><Link to="/" className="premium-nav-link text-decoration-none text-dark fw-bold">Home</Link></li>
            <li><Link to="/services" className="premium-nav-link text-decoration-none text-dark fw-bold">Services</Link></li>
            <li><Link to="/eshop" className="premium-nav-link text-decoration-none text-dark fw-bold">E-shop</Link></li>
            <li><Link to="/contact" className="premium-nav-link text-decoration-none text-dark fw-bold">Contact Us</Link></li>
          </ul>

          {/* Εικονίδια Προφίλ & Καλαθιού */}
          <div className="d-flex gap-3 align-items-center justify-content-end" style={{ flex: 1 }}>
            
            {/* ΘΕΣΗ ΓΙΑ DESKTOP */}
            <div className="d-none d-md-block">
              {userAuthContent}
            </div>

            {/* Καλάθι */}
            <button onClick={() => setIsCartOpen(true)} className="cart-toggle-btn position-relative" style={{ background: 'none', border: 'none', padding: 0 }} aria-label="Cart">
              <svg viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="1.5" style={{ width: '28px', height: '28px' }}>
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
              </svg>
              {cartItemsCount > 0 && (
                <span className="cart-badge" style={{ position: 'absolute', top: '-5px', right: '-8px', background: '#ef4444', color: '#fff', borderRadius: '50%', padding: '2px 6px', fontSize: '12px', fontWeight: 'bold' }}>
                  {cartItemsCount}
                </span>
              )}
            </button>

          </div>
        </div>
      </header>

      <CartSidebar 
        isOpen={isCartOpen} 
        setIsOpen={setIsCartOpen} 
        cart={cart} 
        setCart={setCart} 
      />
    </div>
  );
}

export default Header;
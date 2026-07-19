import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import VDLogo from '../assets/VD-Logo.png';
import CartSidebar from './CartSidebar';
import '../index.css';

const LANGUAGES = [
  { code: 'el', label: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' }
];

function Header({ cart, setCart }) {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
  const { t, i18n } = useTranslation();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('vd_user')));
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [productCategories, setProductCategories] = useState([]);
  const cartItemsCount = cart ? cart.reduce((count, item) => count + item.qty, 0) : 0;
  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  const changeLanguage = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem('vd_lang', code);
    setShowLangDropdown(false);
  };

  useEffect(() => {
    const checkUser = () => setUser(JSON.parse(localStorage.getItem('vd_user')));
    window.addEventListener('storage', checkUser);
    return () => window.removeEventListener('storage', checkUser);
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/products/categories`)
      .then(res => res.json())
      .then(setProductCategories)
      .catch(err => console.error(err));
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
                {t('header.myProfile')}
              </button>
              <button onClick={handleLogout} className="pro-dropdown-item text-danger">
                {t('header.logout')}
              </button>
            </div>
          )}
        </>
      ) : (
        <button className="pro-header-btn login-btn" onClick={() => navigate('/login')}>
          {t('header.login')}
        </button>
      )}
    </div>
  );

  const languageSwitcher = (
    <div style={{ position: 'relative' }}>
      <button className="pro-header-btn" onClick={() => setShowLangDropdown(!showLangDropdown)} aria-label={t('header.language')}>
        <span className="pro-btn-name">{currentLang.flag} {currentLang.code.toUpperCase()}</span>
        <span className="pro-btn-arrow">▾</span>
      </button>

      {showLangDropdown && (
        <div className="pro-dropdown" style={{ width: '160px' }}>
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className="pro-dropdown-item"
              style={{ fontWeight: lang.code === i18n.language ? 700 : 500 }}
            >
              {lang.flag} {lang.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="Header"> 
      <header className="py-3 mb-4 border-bottom position-relative">
      
        {/* --- ΕΙΔΙΚΗ ΘΕΣΗ ΓΙΑ ΚΙΝΗΤΑ (Top Right) --- */}
        <div className="d-md-none position-absolute d-flex gap-2" style={{ top: '15px', right: '15px', zIndex: 100 }}>
          {languageSwitcher}
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
            <li>
              <NavLink to="/" end className={({ isActive }) => `premium-nav-link text-decoration-none text-dark fw-bold${isActive ? ' active' : ''}`}>{t('header.navHome')}</NavLink>
            </li>
            <li className="services-nav-item">
              <NavLink to="/services" className={({ isActive }) => `premium-nav-link text-decoration-none text-dark fw-bold${isActive ? ' active' : ''}`}>{t('header.navServices')}</NavLink>
              <ul className="services-dropdown-menu">
                <li><Link to="/services/Χέρια" className="services-dropdown-link">{t('header.categoryHands')}</Link></li>
                <li><Link to="/services/Πόδια" className="services-dropdown-link">{t('header.categoryFeet')}</Link></li>
                <li><Link to="/services/Πρόσωπο" className="services-dropdown-link">{t('header.categoryFace')}</Link></li>
              </ul>
            </li>
            <li className="services-nav-item">
              <NavLink to="/eshop" className={({ isActive }) => `premium-nav-link text-decoration-none text-dark fw-bold${isActive ? ' active' : ''}`}>{t('header.navEshop')}</NavLink>
              {productCategories.length > 0 && (
                <ul className="services-dropdown-menu">
                  {productCategories.map(cat => (
                    <li key={cat}><Link to={`/eshop?category=${encodeURIComponent(cat)}`} className="services-dropdown-link">{cat}</Link></li>
                  ))}
                </ul>
              )}
            </li>
            <li>
              <NavLink to="/contact" className={({ isActive }) => `premium-nav-link text-decoration-none text-dark fw-bold${isActive ? ' active' : ''}`}>{t('header.navFindUs')}</NavLink>
            </li>
            <li>
              <Link to="/booking" className="mirror-button header-booking-btn">{t('header.navBooking')}</Link>
            </li>
          </ul>

          {/* Εικονίδια Προφίλ & Καλαθιού */}
          <div className="d-flex gap-3 align-items-center justify-content-end" style={{ flex: 1 }}>
            
            {/* ΘΕΣΗ ΓΙΑ DESKTOP */}
            <div className="d-none d-md-block">
              {languageSwitcher}
            </div>
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
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../index.css';

const products = [
  { id: 1, name: "Signature Red Polish", price: 12.00, category: "Βερνίκια", image: "https://images.unsplash.com/photo-1631730486784-02981683f95f?q=80&w=500&auto=format&fit=crop" },
  { id: 2, name: "Almond Cuticle Oil", price: 8.50, category: "Φροντίδα", image: "https://images.unsplash.com/photo-1599305090598-fe179d501227?auto=format&fit=crop&w=500&q=80" },
  { id: 3, name: "Nude Elegance Gel", price: 14.00, category: "Ημιμόνιμα", image: "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=500&q=80" },
  { id: 4, name: "Luxury Hand Cream", price: 18.00, category: "Φροντίδα", image: "https://images.unsplash.com/photo-1611078489935-0cb964de46d6?auto=format&fit=crop&w=500&q=80" }
];

function Shop() {
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
    setIsCartOpen(true);
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const cartTotal = cart.reduce((total, item) => total + (item.price * item.qty), 0);
  const cartItemsCount = cart.reduce((count, item) => count + item.qty, 0);

  return (
    <div className="shop-wrapper">
      <div className="shop-header">
        <div>
          <h1 className="shop-title">Boutique.</h1>
          <p className="shop-subtitle">Επαγγελματικά προϊόντα για το σπίτι.</p>
        </div>
        
        <button className="cart-toggle-btn" onClick={() => setIsCartOpen(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
          {cartItemsCount > 0 && <span className="cart-badge">{cartItemsCount}</span>}
        </button>
      </div>

      <div className="products-grid">
        {products.map(product => (
          <div key={product.id} className="product-card">
            <div className="product-image-container">
              <img src={product.image} alt={product.name} className="product-image" />
              <button className="add-to-cart-btn" onClick={() => addToCart(product)}>
                Προσθήκη
              </button>
            </div>
            <div className="product-info">
              <span className="product-category">{product.category}</span>
              <h3 className="product-name">{product.name}</h3>
              <p className="product-price">{product.price.toFixed(2)}€</p>
            </div>
          </div>
        ))}
      </div>

      <div className={`cart-overlay ${isCartOpen ? 'open' : ''}`} onClick={() => setIsCartOpen(false)}></div>
      
      <div className={`cart-sidebar ${isCartOpen ? 'open' : ''}`}>
        <div className="cart-header">
          <h2>Το Καλάθι σας</h2>
          <button className="close-cart-btn" onClick={() => setIsCartOpen(false)}>✕</button>
        </div>

        <div className="cart-items">
          {cart.length === 0 ? (
            <p className="empty-cart-msg">Το καλάθι σας είναι άδειο.</p>
          ) : (
            cart.map(item => (
              <div key={item.id} className="cart-item">
                <img src={item.image} alt={item.name} />
                <div className="cart-item-details">
                  <h4>{item.name}</h4>
                  <p>{item.price.toFixed(2)}€ x {item.qty}</p>
                </div>
                <button className="remove-item-btn" onClick={() => removeFromCart(item.id)}>🗑️</button>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="cart-footer">
            <div className="cart-total">
              <span>Σύνολο:</span>
              <span>{cartTotal.toFixed(2)}€</span>
            </div>
            <Link to="/checkout">
              <button className="checkout-btn">Ταμείο</button>
            </Link>
          </div>
        )}
      </div>

    </div>
  );
}

export default Shop;
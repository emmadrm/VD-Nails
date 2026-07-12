import React from 'react';
import { Link } from "react-router-dom";

function CartSidebar({ isOpen, setIsOpen, cart, setCart }) {
  
  const updateCartQuantity = (id, delta) => {
    setCart(prevCart => 
      prevCart.map(item => 
        item.id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item
      ).filter(item => item.qty > 0)
    );
  };

  const cartSubtotal = cart ? cart.reduce((total, item) => total + (item.price * item.qty), 0) : 0;

  return (
    <div className={`cart-overlay ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(false)}>
      <div className={`cart-sidebar ${isOpen ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
        
        <div className="cart-header">
          <h2>Το Καλάθι σας</h2>
          <button onClick={() => setIsOpen(false)} className="close-cart-btn">&times;</button>
        </div>

        <div className="cart-items">
          {cart && cart.length > 0 ? (
            cart.map((item) => (
              <div key={item.id} className="cart-item">
                {item.image_url && <img src={item.image_url} alt={item.name} />}
                <div className="cart-item-details" style={{ flex: 1 }}>
                  <h4>{item.name}</h4>
                  <div className="d-flex align-items-center gap-2 mt-2">
                    <button onClick={() => updateCartQuantity(item.id, -1)} className="btn btn-sm btn-outline-secondary">-</button>
                    <span>{item.qty}</span>
                    <button onClick={() => updateCartQuantity(item.id, 1)} className="btn btn-sm btn-outline-secondary">+</button>
                  </div>
                </div>
                <div style={{ fontWeight: 'bold', color: '#3b2b1f', marginRight: '15px' }}>
                  {(item.price * item.qty).toFixed(2)}€
                </div>
                <button onClick={() => updateCartQuantity(item.id, -item.qty)} className="remove-item-btn">×</button>
              </div>
            ))
          ) : (
            <div className="empty-cart-msg">Το καλάθι σας είναι άδειο.</div>
          )}
        </div>

        <div className="cart-footer">
          <div className="cart-total">
            <span>Σύνολο:</span>
            <span>{cartSubtotal.toFixed(2)}€</span>
          </div>
          <Link to="/checkout" onClick={() => setIsOpen(false)} style={{ textDecoration: 'none' }}>
            <button className="checkout-btn" disabled={!cart || cart.length === 0} style={{ opacity: cart?.length > 0 ? 1 : 0.5 }}>
              Μετάβαση στο Ταμείο
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default CartSidebar;
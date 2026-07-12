import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import CartSidebar from '../components/CartSidebar'; 
import '../index.css';

function Shop({ cart, setCart }) {

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false); 

  useEffect(() => {
    fetch(`${API_URL}/api/products`)
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Σφάλμα φόρτωσης προϊόντων:", err);
        setLoading(false);
      });
  }, []);

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id && !item.isAppointment);
    
    if (existingItem) {
      setCart(cart.map(item => 
        (item.id === product.id && !item.isAppointment) ? { ...item, qty: item.qty + 1 } : item
      ));
    } else {
      setCart([...cart, { ...product, price: Number(product.price), qty: 1, isAppointment: false }]);
    }
    setIsCartOpen(true); 
  };

  if (loading) {
    return (
      <div className="shop-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <h2 style={{ color: '#8c7a6b' }}>Φόρτωση Προϊόντων...</h2>
      </div>
    );
  }

  return (
    <div className="shop-wrapper">
      <div className="shop-header">
        <div>
          <h1 className="shop-title">Boutique.</h1>
          <p className="shop-subtitle">Επαγγελματικά προϊόντα για το σπίτι.</p>
        </div>
      </div>

      <div className="products-grid">
        {products.length === 0 ? (
          <p style={{ textAlign: 'center', width: '100%', color: '#8c7a6b' }}>Δεν βρέθηκαν προϊόντα.</p>
        ) : (
          products.map(product => (
            <div key={product.id} className="product-card">
              <div className="product-image-container">
                <img src={product.image_url || 'https://picsum.photos/200'} alt={product.name} className="product-image" />
                <button className="add-to-cart-btn" onClick={() => addToCart(product)}>
                  Προσθήκη
                </button>
              </div>
              <div className="product-info">
                <h3 className="product-name">{product.name}</h3>
                <p className="product-price">{Number(product.price).toFixed(2)}€</p>
              </div>
            </div>
          ))
        )}
      </div>

      <CartSidebar 
        isOpen={isCartOpen} 
        setIsOpen={setIsCartOpen} 
        cart={cart} 
        setCart={setCart} 
      />

    </div>
  );
}

export default Shop;
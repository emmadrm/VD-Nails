import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CartSidebar from '../components/CartSidebar';
import '../index.css';

function Shop({ cart, setCart }) {
  const { t } = useTranslation();

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = searchParams.get('category') || 'all';

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

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
  const filteredProducts = selectedCategory === 'all' ? products : products.filter(p => p.category === selectedCategory);

  const handleCategoryChange = (e) => {
    const value = e.target.value;
    if (value === 'all') setSearchParams({});
    else setSearchParams({ category: value });
  };

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
        <h2 style={{ color: '#8c7a6b' }}>{t('eshop.loading')}</h2>
      </div>
    );
  }

  return (
    <div className="shop-wrapper">
      <div className="shop-header">
        <div>
          <h1 className="shop-title">{t('eshop.title')}</h1>
          <p className="shop-subtitle">{t('eshop.subtitle')}</p>
        </div>
        {categories.length > 0 && (
          <div>
            <label htmlFor="shop-category-filter" style={{ display: 'block', fontSize: '0.85rem', color: '#605851', marginBottom: '6px' }}>{t('eshop.categoryLabel')}</label>
            <select
              id="shop-category-filter"
              value={selectedCategory}
              onChange={handleCategoryChange}
              style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #d4c4b7', color: '#3b2b1f', background: '#fff', fontWeight: '600' }}
            >
              <option value="all">{t('eshop.allCategories')}</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="products-grid">
        {filteredProducts.length === 0 ? (
          <p style={{ textAlign: 'center', width: '100%', color: '#8c7a6b' }}>{t('eshop.noProducts')}</p>
        ) : (
          filteredProducts.map(product => (
            <div key={product.id} className="product-card">
              <div className="product-image-container">
                <img src={product.image_url || 'https://picsum.photos/200'} alt={product.name} className="product-image" />
                {product.stock <= 0 ? (
                  <button disabled style={{ background: '#6c757d', color: '#fff', cursor: 'not-allowed' }}>
                    🚫 {t('eshop.soldOut')}
                  </button>
                ) : (
                <button className="add-to-cart-btn" onClick={() => addToCart(product)}>
                  {t('eshop.addToCart')}
                </button>
                )}
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
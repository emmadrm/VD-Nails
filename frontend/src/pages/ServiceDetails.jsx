import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import '../index.css';

export default function ServiceDetails() {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  const { category } = useParams();
  const [services, setServices] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/api/services`)
      .then(res => res.json())
      .then(data => setServices(data.filter(s => s.category === category)))
      .catch(err => console.error(err));
  }, [category]);

  return (
    <div className="container py-5">
      <h2 className="text-center mb-5" style={{ fontFamily: 'Instrument Serif', fontSize: '3rem' }}>{category}</h2>
      <div className="row g-4">
        {services.map(service => (
          <div key={service.id} className="col-md-6 col-lg-4">
            <div className="service-card h-100 p-4 border-0 shadow-sm" style={{ borderRadius: '20px', background: '#fdfcfb' }}>
              <h4 className="mb-3" style={{ color: '#3b2b1f' }}>{service.name}</h4>
              <p className="text-muted" style={{ fontSize: '0.9rem', minHeight: '60px' }}>{service.description}</p>
              <div className="d-flex justify-content-between align-items-center mt-4">
                <span className="h5 mb-0" style={{ color: '#8c7a6b' }}>{Number(service.price).toFixed(2)}€</span>
                <Link to="/booking" state={{ serviceName: service.name, category: category }} className="premium-btn">
                  Επιλογή
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
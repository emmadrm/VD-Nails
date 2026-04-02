import React from 'react';
import '../index.css';

export default function Contact() {
  const storeAddress = "Pentelis 13, Agia Paraskevi 15343, Greece"; 
  const encodedAddress = encodeURIComponent(storeAddress);
  
  const googleMapsLink = `https://maps.google.com/?q=${encodedAddress}`;
  const appleMapsLink = `http://maps.apple.com/?daddr=${encodedAddress}`;
  const mapEmbedUrl = `https://maps.google.com/maps?q=${encodedAddress}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  const instagramLink = "https://instagram.com/vdnailsart"; 

  return (
    <div className="booking-wrapper">
      <div className="compact-split-card">
        <div className="compact-content">
          <h2 className="compact-title">Βρείτε Μας.</h2>
          <p className="compact-subtitle">Επισκεφθείτε τον χώρο μας και αφεθείτε στα χέρια των ειδικών.</p>

          <div className="compact-details">
            <div className="detail-row">
              <div className="svg-icon-container">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
              </div>
              <div className="detail-text">
                <strong>Διεύθυνση</strong>
                <span>{storeAddress}</span>
              </div>
            </div>

            <div className="detail-row">
              <div className="svg-icon-container">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
              </div>
              <div className="detail-text">
                <strong>Τηλέφωνο</strong>
                <a href="tel:+306909386660" className="interactive-link">690 938 6660</a>
              </div>
            </div>

            <div className="detail-row">
              <div className="svg-icon-container">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              </div>
              <div className="detail-text">
                <strong>Email</strong>
                <a href="mailto:vasodrm2@gmail.com" className="interactive-link">vasodrm2@gmail.com</a>
              </div>
            </div>

            <div className="detail-row">
              <div className="svg-icon-container">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </div>
              <div className="detail-text">
                <strong>Instagram</strong>
                <a href={instagramLink} target="_blank" rel="noopener noreferrer" className="insta-link">@vdnailsart</a>
              </div>
            </div>

          </div>

          <div className="compact-actions">
            <a href={googleMapsLink} target="_blank" rel="noopener noreferrer" className="nav-btn-small outline-btn">Google Maps</a>
            <a href={appleMapsLink} target="_blank" rel="noopener noreferrer" className="nav-btn-small solid-btn">Apple Maps</a>
          </div>
        </div>

        <div className="compact-map">
          <iframe 
            src={mapEmbedUrl}
            width="100%" 
            height="100%" 
            style={{ border: 0 }} 
            allowFullScreen="" 
            loading="lazy" 
            title="VD Nails Location"
          ></iframe>
        </div>

      </div>
    </div>
  );
}
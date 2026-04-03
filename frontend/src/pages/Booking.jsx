import React, { useState } from 'react';
import '../index.css'; 
import { Link } from 'react-router-dom';
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import el from 'date-fns/locale/el'; 
registerLocale('el', el);

export default function Booking() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    service: 'manicure',
    date: null, 
    time: null,
    payment: 'store'  
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    const newErrors = {};

    const nameParts = formData.name.trim().split(/\s+/);
    if (nameParts.length < 2) {
      newErrors.name = 'Παρακαλώ συμπληρώστε το ονοματεπώνυμο.';
    }

    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(formData.phone)) {
      newErrors.phone = 'Παρακαλώ συμπληρώστε τον 10-ψήφιο αριθμό τηλεφώνου.';
    }

    if (!formData.date) {
      newErrors.date = 'Παρακαλώ επιλέξτε ημερομηνία.';
    }
    if (!formData.time) {
      newErrors.time = 'Παρακαλώ επιλέξτε ώρα.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      console.log("Το ραντεβού που ζητήθηκε:", formData);
      alert(`Τέλεια, ${formData.name}! Το αίτημά σου καταγράφηκε.`);
    }
  };

  const minTime = new Date();
  minTime.setHours(9, 0, 0);
  const maxTime = new Date();
  maxTime.setHours(21, 0, 0);

  return (
    <div className="booking-wrapper">
      <div className="glass-card">
        <h2 className="booking-title">Κλείστε το Ραντεβού σας</h2>
        <p className="booking-subtitle">Επιλέξτε την υπηρεσία και την ώρα που σας εξυπηρετεί.</p>

        <form onSubmit={handleSubmit} className="booking-form">
          
          <div className="form-group">
            <label htmlFor="name">Ονοματεπώνυμο</label>
            <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required placeholder="π.χ. Μαρία Παπαδοπούλου" />
            {errors.name && <p className="error">{errors.name}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="phone">Τηλέφωνο</label>
            <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange} required placeholder="π.χ. 69........" />
            {errors.phone && <p className="error">{errors.phone}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="service">Υπηρεσία</label>
            <select id="service" name="service" value={formData.service} onChange={handleChange} required>
              <option value="manicure">Manicure (Απλό / Ημιμόνιμο)</option>
              <option value="pedicure">Pedicure (Spa / Θεραπευτικό)</option>
              <option value="face">Περιποίηση Προσώπου</option>
              <option value="other">Άλλο / Συνδυασμός</option>
            </select>
          </div>

          <div className="form-group">
            <label>Τρόπος Πληρωμής</label>
            <div className="radio-group">
              <label className="radio-label">
                <input type="radio" name="payment" value="prepay" checked={formData.payment === 'prepay'} onChange={handleChange} required />
                Προπληρωμή
              </label>
              <label className="radio-label">
                <input type="radio" name="payment" value="store" checked={formData.payment === 'store'} onChange={handleChange} required />
                Πληρωμή στο Κατάστημα (Προκαταβολή 5€)
              </label>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group half-width custom-picker-container">
              <label htmlFor="date">Ημερομηνία</label>
              <DatePicker
                selected={formData.date}
                onChange={(date) => setFormData({ ...formData, date: date })}
                dateFormat="dd/MM/yyyy" 
                locale="el" 
                minDate={new Date()} 
                placeholderText="Επιλέξτε μέρα"
                className="elegant-input"
                required
              />
              {errors.date && <p className="error">{errors.date}</p>}
            </div>

            <div className="form-group half-width custom-picker-container">
              <label htmlFor="time">Ώρα</label>
              <DatePicker
                selected={formData.time}
                onChange={(time) => setFormData({ ...formData, time: time })}
                showTimeSelect
                showTimeSelectOnly
                timeIntervals={30} 
                timeCaption="Ώρα"
                dateFormat="HH:mm" 
                minTime={minTime} 
                maxTime={maxTime} 
                placeholderText="Επιλέξτε ώρα"
                className="elegant-input"
                required
              />
              {errors.time && <p className="error">{errors.time}</p>}
            </div>
          </div>

          <Link to="/checkout">
            <button type="submit" className="icon-link">
                Επιβεβαίωση Κράτησης
              </button>
          </Link>
        </form>
      </div>
    </div>
  );
}
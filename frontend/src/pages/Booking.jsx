import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import '../index.css'; 
import { useNavigate, useLocation } from 'react-router-dom';
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import el from 'date-fns/locale/el'; 
registerLocale('el', el);
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUB_KEY;
const stripePromise = loadStripe(stripePublishableKey);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
  const minutes = (totalMinutes % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

// --- ΦΟΡΜΑ ΠΛΗΡΩΜΗΣ STRIPE ---
const AppointmentPaymentForm = ({ totalAmount, payload, setIsSubmitting, isSubmitting }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [stripeError, setStripeError] = useState(null);

  const handleStripeSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsSubmitting(true);
    setStripeError(null);

    try {
      const res = await fetch(`${API_URL}/create-payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Math.round(totalAmount * 100) }) 
      });
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      const clientSecret = data.clientSecret;

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: { name: payload.client_name },
        }
      });

      if (result.error) {
        setStripeError(result.error.message);
      } else if (result.paymentIntent.status === 'succeeded') {
        const stripeId = result.paymentIntent.id;
        
        // 1. ΔΙΟΡΘΩΣΗ: Περνάμε το stripe_payment_intent_id και αλλάζουμε το status σε 'completed'
        const finalPayload = { 
          ...payload, 
          stripe_payment_intent_id: stripeId, 
          payment_method: 'prepay_success',
          payment_status: 'completed'
        };
        
        const saveRes = await fetch(`${API_URL}/api/appointments/direct`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finalPayload)
        });

        if (saveRes.ok) {
          navigate('/success', { state: { isAppointment: true } });
        } else {
          setStripeError('Υπήρξε πρόβλημα με την καταχώρηση. Επικοινωνήστε μαζί μας.');
        }
      }
    } catch (err) {
      console.error(err);
      setStripeError('Σφάλμα επικοινωνίας με την τράπεζα.');
    } finally {
      setIsSubmitting(false); 
    }
  };

  return (
    <div style={{ marginTop: '20px', background: '#f9fafb', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
      <h5 style={{ color: '#3b2b1f', marginBottom: '15px' }}>Στοιχεία Κάρτας (Stripe)</h5>
      <div className="card-inputs-wrapper" style={{ padding: '15px', width: '100%', backgroundColor: '#ffffff', minHeight: '50px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
        <CardElement options={{ style: { base: { fontSize: '16px', color: '#3b2b1f' } } }} />
      </div>
      
      {stripeError && <div style={{ color: '#ef4444', marginTop: '10px', fontSize: '0.9rem', fontWeight: 'bold' }}>{stripeError}</div>}
      
      <button type="button" onClick={handleStripeSubmit} disabled={!stripe || isSubmitting} className="btn w-100 fw-bold mt-3" style={{ backgroundColor: '#10b981', color: '#fff', padding: '12px' }}>
        {isSubmitting ? 'Επεξεργασία Πληρωμής...' : `Πληρωμή & Ολοκλήρωση ${Number(totalAmount).toFixed(2)}€`}
      </button>
    </div>
  );
};

// --- ΚΕΝΤΡΙΚΟ COMPONENT ---
export default function Booking() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const { serviceName } = location.state || {};
  const activeCategory = location.state?.category || 'Χέρια';
  
  const [dbServices, setDbServices] = useState([]);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStripeForm, setShowStripeForm] = useState(false);

  const storedUser = JSON.parse(localStorage.getItem('vd_user') || '{}');

  const [clientData, setClientData] = useState({
    name: storedUser.name || '',
    email: storedUser.email || '',
    phone: storedUser.phone || ''
  });

  const [formData, setFormData] = useState({
    serviceId: '',
    date: null, 
    time: '',
    payment: 'store'
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetch(`${API_URL}/api/services`)
      .then(res => res.json())
      .then(data => {
        setDbServices(data);
        let initialId = '';
        if (serviceName) {
            const found = data.find(s => s.name === serviceName);
            if (found) initialId = found.id.toString();
        } else {
            const categoryServices = data.filter(s => s.category === activeCategory);
            if (categoryServices.length > 0) initialId = categoryServices[0].id.toString();
        }
        setFormData(prev => ({ ...prev, serviceId: initialId }));
      })
      .catch(err => console.error(err));
  }, [activeCategory, serviceName]);

  useEffect(() => {
    if (!formData.date || !formData.serviceId || dbServices.length === 0) return;

    setLoadingTimes(true);
    const year = formData.date.getFullYear();
    const month = String(formData.date.getMonth() + 1).padStart(2, '0');
    const day = String(formData.date.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    const currentService = dbServices.find(s => s.id.toString() === formData.serviceId);
    const currentDuration = currentService ? parseInt(currentService.duration_minutes) : 60;

    fetch(`${API_URL}/api/booked-times?date=${formattedDate}`)
      .then(res => res.json())
      .then(bookedSlots => {
        const startDay = timeToMinutes("09:00");
        const endDay = timeToMinutes("21:00");
        
        const now = new Date();
        const isToday = formData.date.toDateString() === now.toDateString();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        const generatedFreeSlots = [];

        for (let minutes = startDay; minutes < endDay; minutes += 30) {
          if (isToday && minutes <= currentMinutes) continue;

          const proposedStart = minutes;
          const proposedEnd = minutes + currentDuration;
          
          if (proposedEnd > endDay) continue;

          let isOverlap = false;
          for (let booked of bookedSlots) {
            if (!booked.time) continue;
            
            const bookedStart = timeToMinutes(booked.time);
            const bookedEnd = bookedStart + booked.duration;

            if (proposedStart < bookedEnd && proposedEnd > bookedStart) {
              isOverlap = true;
              break;
            }
          }
          if (!isOverlap) generatedFreeSlots.push(minutesToTime(proposedStart));
        }

        setAvailableTimes(generatedFreeSlots);
        setLoadingTimes(false);
      })
      .catch(err => {
        console.error(err);
        setLoadingTimes(false);
      });
  }, [formData.date, formData.serviceId, dbServices]);

  const availableServices = dbServices.filter(s => s.category === activeCategory);
  const selectedServiceObj = dbServices.find(s => s.id.toString() === formData.serviceId);

  const handleClientChange = (e) => {
    setClientData({ ...clientData, [e.target.name]: e.target.value });
  };

  const getBookingPayload = () => {
    if (!selectedServiceObj || !formData.date) return {};

    const year = formData.date.getFullYear();
    const month = String(formData.date.getMonth() + 1).padStart(2, '0');
    const day = String(formData.date.getDate()).padStart(2, '0');
    const localFormattedDate = `${year}-${month}-${day}`; 

    return {
      user_id: storedUser.id || null, // 2. ΔΙΟΡΘΩΣΗ: Προσθήκη του user_id
      client_name: clientData.name,
      client_email: clientData.email,
      client_phone: clientData.phone,
      service_id: selectedServiceObj.id,
      service_name: selectedServiceObj.name,
      service_price: selectedServiceObj.price, // 3. ΔΙΟΡΘΩΣΗ: Προσθήκη του κόστους της υπηρεσίας
      appointment_date: localFormattedDate, 
      appointment_time: formData.time,
      payment_method: formData.payment,
      payment_status: formData.payment === 'store' ? 'completed' : 'pending' // 4. ΔΙΟΡΘΩΣΗ: 'completed' για κατάστημα, 'pending' προσωρινά για κάρτα
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const newErrors = {};
    if (!formData.time) newErrors.time = 'Παρακαλώ επιλέξτε ώρα.';
    if (clientData.name.trim().split(/\s+/).length < 2) newErrors.name = 'Συμπληρώστε πλήρες ονοματεπώνυμο.';
    if (!/^\d{10}$/.test(clientData.phone)) newErrors.phone = 'Το τηλέφωνο πρέπει να έχει 10 ψηφία.';

    if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
    }

    setErrors({});

    if (formData.payment === 'prepay') {
      setShowStripeForm(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/appointments/direct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getBookingPayload())
      });
      
      if (res.ok) {
        navigate('/success', { state: { isAppointment: true } });
      } else {
        const data = await res.json();
        toast.error(data.error || "Υπήρξε πρόβλημα με την κράτηση.");
      }
    } catch (err) {
      toast.error("Σφάλμα σύνδεσης.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="booking-wrapper py-5">
      <div className="glass-card mx-auto" style={{ maxWidth: '600px', padding: '30px', borderRadius: '15px' }}>
        <h2 className="text-center mb-4" style={{ color: '#3b2b1f' }}>Κλείστε το Ραντεβού σας</h2>
        
        <form onSubmit={handleSubmit} className="booking-form" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ background: '#f9fafb', padding: '15px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <input type="text" name="name" className="form-control mb-2" placeholder="Ονοματεπώνυμο *" required disabled={showStripeForm} value={clientData.name} onChange={handleClientChange} />
            {errors.name && <p style={{ color: '#ef4444', fontSize: '0.85rem' }}>{errors.name}</p>}

            <input type="tel" name="phone" className="form-control mb-2" placeholder="Τηλέφωνο *" required disabled={showStripeForm} value={clientData.phone} onChange={handleClientChange} />
            {errors.phone && <p style={{ color: '#ef4444', fontSize: '0.85rem' }}>{errors.phone}</p>}

            <input type="email" name="email" className="form-control" placeholder="Email *" required disabled={showStripeForm} value={clientData.email} onChange={handleClientChange} />
          </div>

          <div>
            <select name="serviceId" value={formData.serviceId} className="form-control mb-3" disabled={showStripeForm} onChange={(e) => setFormData({...formData, serviceId: e.target.value})} required>
              {availableServices.map(srv => (
                <option key={srv.id} value={srv.id}>{srv.name} ({Number(srv.price).toFixed(2)}€)</option>
              ))}
            </select>

            <DatePicker 
              selected={formData.date} 
              disabled={showStripeForm}
              onChange={(d) => { setFormData({ ...formData, date: d, time: '' }); setErrors({}); setShowStripeForm(false); }} 
              dateFormat="dd/MM/yyyy" minDate={new Date()} className="form-control w-100" placeholderText="Επιλέξτε ημέρα" required 
            />
          </div>

          {formData.date && (
            <div>
              <label className="fw-bold mb-2">Διαθέσιμες Ώρες</label>
              {errors.time && <div className="text-danger small mb-2">{errors.time}</div>}
              {loadingTimes ? <p className="text-muted">Αναζήτηση...</p> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '10px' }}>
                  {availableTimes.length > 0 ? availableTimes.map(t => (
                    <button key={t} type="button" disabled={showStripeForm} onClick={() => { setFormData({ ...formData, time: t }); setErrors({}); setShowStripeForm(false); }}
                      style={{ 
                        padding: '8px', borderRadius: '6px', border: '1px solid #3b2b1f',
                        background: formData.time === t ? '#3b2b1f' : 'transparent', color: formData.time === t ? '#fff' : '#3b2b1f', cursor: 'pointer'
                      }}>
                      {t}
                    </button>
                  )) : <p className="text-danger small">Δεν υπάρχουν διαθέσιμες ώρες.</p>}
                </div>
              )}
            </div>
          )}

          {formData.time && (
            <div style={{ background: '#f3f4f6', padding: '15px', borderRadius: '8px' }}>
               <label className="fw-bold mb-2">Τρόπος Πληρωμής</label>
               <div className="d-flex flex-column gap-2">
                 <label style={{ cursor: 'pointer' }}>
                   <input type="radio" name="payment" value="store" checked={formData.payment === 'store'} 
                     onChange={(e) => { setFormData({...formData, payment: e.target.value}); setShowStripeForm(false); }} className="me-2" />
                   Πληρωμή στο κατάστημα
                 </label>
                 <label style={{ cursor: 'pointer' }}>
                   <input type="radio" name="payment" value="prepay" checked={formData.payment === 'prepay'} 
                     onChange={(e) => setFormData({...formData, payment: e.target.value})} className="me-2" />
                   Πληρωμή τώρα με Κάρτα
                 </label>
               </div>
            </div>
          )}

          {showStripeForm && selectedServiceObj ? (
            <Elements stripe={stripePromise}>
              <AppointmentPaymentForm totalAmount={selectedServiceObj.price} payload={getBookingPayload()} setIsSubmitting={setIsSubmitting} isSubmitting={isSubmitting} />
            </Elements>
          ) : (
            <button type="submit" disabled={isSubmitting} className="btn w-100 fw-bold mt-2" style={{ backgroundColor: '#10b981', color: '#fff', padding: '12px' }}>
              {isSubmitting ? 'Επεξεργασία...' : 'Επιβεβαίωση Στοιχείων & Κράτηση'}
            </button>
          )}

        </form>
      </div>
    </div>
  );
}

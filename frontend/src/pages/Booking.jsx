import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import '../index.css'; 
import { useNavigate, useLocation, Link } from 'react-router-dom';
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import el from 'date-fns/locale/el';
registerLocale('el', el);
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useTranslation } from 'react-i18next';
import { generateFreeSlots, isOpenWeekday } from '../businessHours';

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUB_KEY;
const stripePromise = loadStripe(stripePublishableKey);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';


// --- ΦΟΡΜΑ ΠΛΗΡΩΜΗΣ STRIPE ---
const AppointmentPaymentForm = ({ totalAmount, clientSecret, payload, setIsSubmitting, isSubmitting }) => {
  const { t } = useTranslation();
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
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setStripeError(submitError.message);
        return;
      }

      const prepareRes = await fetch(`${API_URL}/api/checkout/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_intent_id: clientSecret.split('_secret_')[0], type: 'appointment', payload })
      });
      if (!prepareRes.ok) {
        const errData = await prepareRes.json().catch(() => ({}));
        throw new Error(errData.error || t('booking.errorBank'));
      }

      const result = await stripe.confirmPayment({
        elements,
        clientSecret,
        redirect: 'if_required',
        confirmParams: {
          return_url: `${window.location.origin}/success`,
        },
      });

      if (result.error) {
        setStripeError(result.error.message);
      } else if (result.paymentIntent?.status === 'succeeded') {
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
          const errData = await saveRes.json().catch(() => ({}));
          setStripeError(errData.error || t('booking.errorRegistration'));
        }
      } else if (result.paymentIntent) {
        navigate(`/success?payment_intent=${result.paymentIntent.id}`);
      }
    } catch (err) {
      console.error(err);
      setStripeError(err.message || t('booking.errorBank'));
    } finally {
      setIsSubmitting(false); 
    }
  };

  return (
    <div style={{ marginTop: '20px', background: '#f9fafb', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
      <h5 style={{ color: '#3b2b1f', marginBottom: '15px' }}>{t('booking.paymentMethod')}</h5>
      <div className="card-inputs-wrapper" style={{ padding: '15px', width: '100%', backgroundColor: '#ffffff', minHeight: '50px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
        <PaymentElement
          options={{
            layout: { type: 'accordion', defaultCollapsed: false },
            wallets: { applePay: 'auto', googlePay: 'auto' },
          }}
        />
      </div>
      
      {stripeError && <div style={{ color: '#ef4444', marginTop: '10px', fontSize: '0.9rem', fontWeight: 'bold' }}>{stripeError}</div>}
      
      <button type="button" onClick={handleStripeSubmit} disabled={!stripe || isSubmitting} className="pay-now-btn" style={{ marginTop: '15px' }}>
        {isSubmitting ? t('booking.processingPayment') : `${t('booking.payAndComplete')} ${Number(totalAmount).toFixed(2)}€`}
      </button>
    </div>
  );
};

// --- ΚΕΝΤΡΙΚΟ COMPONENT ---
export default function Booking() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  
  const { serviceName } = location.state || {};
  const stateCategory = location.state?.category;
  
  const [dbServices, setDbServices] = useState([]);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStripeForm, setShowStripeForm] = useState(false);
  const [paymentClientSecret, setPaymentClientSecret] = useState('');
  const [continueAsGuest, setContinueAsGuest] = useState(false);

  const storedUser = JSON.parse(localStorage.getItem('vd_user') || '{}');
  const isLoggedIn = !!storedUser.id;

  const [clientData, setClientData] = useState({
    name: storedUser.name || '',
    email: storedUser.email || '',
    phone: storedUser.phone || ''
  });
  const [appointmentNotes, setAppointmentNotes] = useState('');

  const [formData, setFormData] = useState({
    date: null,
    time: '',
    payment: 'store'
  });

  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
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
        } else if (stateCategory) {
            const categoryServices = data.filter(s => s.category === stateCategory);
            if (categoryServices.length > 0) initialId = categoryServices[0].id.toString();
        }
        setSelectedServiceIds(initialId ? [initialId] : []);
      })
      .catch(err => console.error(err));
  }, [stateCategory, serviceName]);

  const selectedServiceObjs = dbServices.filter(s => selectedServiceIds.includes(s.id.toString()));
  const totalDuration = selectedServiceObjs.reduce((sum, s) => sum + parseInt(s.duration_minutes || 0), 0);
  const totalPrice = selectedServiceObjs.reduce((sum, s) => sum + Number(s.price || 0), 0);

  const toggleService = (id) => {
    const idStr = id.toString();
    setSelectedServiceIds(prev => prev.includes(idStr) ? prev.filter(x => x !== idStr) : [...prev, idStr]);
    setFormData(prev => ({ ...prev, time: '' }));
    setPaymentClientSecret('');
    setShowStripeForm(false);
  };

  useEffect(() => {
    if (!formData.date || selectedServiceIds.length === 0 || dbServices.length === 0) return;

    setLoadingTimes(true);
    const year = formData.date.getFullYear();
    const month = String(formData.date.getMonth() + 1).padStart(2, '0');
    const day = String(formData.date.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    const currentDuration = totalDuration || 60;

    const fetchJson = (url) => fetch(url).then(res => { if (!res.ok) throw new Error(`${url}: ${res.status}`); return res.json(); });

    Promise.all([
      fetchJson(`${API_URL}/api/booked-times?date=${formattedDate}`),
      fetchJson(`${API_URL}/api/business-hours/${formattedDate}`)
    ])
      .then(([bookedSlots, businessHours]) => {
        const now = new Date();
        setAvailableTimes(generateFreeSlots({
          businessHours,
          bookedSlots,
          duration: currentDuration,
          isToday: formData.date.toDateString() === now.toDateString(),
          currentMinutes: now.getHours() * 60 + now.getMinutes()
        }));
        setLoadingTimes(false);
      })
      .catch(err => {
        console.error(err);
        setAvailableTimes([]);
        setLoadingTimes(false);
      });
  }, [formData.date, selectedServiceIds, dbServices]);

  const groupedServices = dbServices.reduce((acc, srv) => {
    (acc[srv.category] = acc[srv.category] || []).push(srv);
    return acc;
  }, {});

  const handleClientChange = (e) => {
    setClientData({ ...clientData, [e.target.name]: e.target.value });
  };

  const getBookingPayload = () => {
    if (selectedServiceObjs.length === 0 || !formData.date) return {};

    const year = formData.date.getFullYear();
    const month = String(formData.date.getMonth() + 1).padStart(2, '0');
    const day = String(formData.date.getDate()).padStart(2, '0');
    const localFormattedDate = `${year}-${month}-${day}`;

    return {
      user_id: storedUser.id || null,
      client_name: clientData.name,
      client_email: clientData.email,
      client_phone: clientData.phone,
      appointment_notes: appointmentNotes,
      services: selectedServiceObjs.map(s => ({ name: s.name, price: Number(s.price), duration_minutes: parseInt(s.duration_minutes) })),
      appointment_date: localFormattedDate,
      appointment_time: formData.time,
      payment_method: formData.payment,
      payment_status: formData.payment === 'store' ? 'completed' : 'pending' // 4. ΔΙΟΡΘΩΣΗ: 'completed' για κατάστημα, 'pending' προσωρινά για κάρτα
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (selectedServiceIds.length === 0) newErrors.service = t('booking.errorNoService');
    if (!formData.time) newErrors.time = t('booking.errorTime');
    if (clientData.name.trim().split(/\s+/).length < 2) newErrors.name = t('booking.errorName');
    if (!/^\d{10}$/.test(clientData.phone)) newErrors.phone = t('booking.errorPhone');

    if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
    }

    setErrors({});

    if (formData.payment === 'prepay') {
      setIsSubmitting(true);
      try {
        const res = await fetch(`${API_URL}/create-payment-intent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'appointment', services: selectedServiceObjs.map(s => ({ name: s.name, price: Number(s.price), duration_minutes: parseInt(s.duration_minutes) })) })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.clientSecret) throw new Error(data.error || t('booking.errorBank'));
        setPaymentClientSecret(data.clientSecret);
        setShowStripeForm(true);
      } catch (err) {
        toast.error(err.message || t('booking.errorBank'));
      } finally {
        setIsSubmitting(false);
      }
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
        toast.error(data.error || t('booking.errorGeneric'));
      }
    } catch (err) {
      toast.error(t('booking.errorConnection'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoggedIn && !continueAsGuest) {
    return (
      <div className="booking-wrapper py-5">
        <div className="glass-card mx-auto" style={{ maxWidth: '520px', padding: '40px 35px', borderRadius: '15px' }}>
          <div className="booking-auth-gate">
            <div className="auth-icon-badge">
              <img src="/logo.png" alt="VD Nails" />
            </div>
            <h2 className="booking-title text-center mb-3">{t('booking.gateTitle')}</h2>
            <p className="booking-auth-gate-text">{t('booking.gateText')}</p>
            <div className="booking-auth-gate-actions">
              <button type="button" className="pay-now-btn" onClick={() => setContinueAsGuest(true)}>
                {t('booking.continueAsGuest')}
              </button>
              <Link to="/login" state={{ from: '/booking', mode: 'login' }} className="pay-now-btn" style={{ margin: 0, display: 'inline-block', textDecoration: 'none', textAlign: 'center' }}>
                {t('booking.gateLoginButton')}
              </Link>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#6c757d' }}>
                {t('booking.registerPrompt')}{' '}
                <Link to="/login" state={{ from: '/booking', mode: 'register' }} className="booking-auth-gate-login-link">
                  {t('booking.registerPromptLink')}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-wrapper py-5">
      <div className="glass-card mx-auto" style={{ maxWidth: '600px', padding: '30px', borderRadius: '15px' }}>
        <h2 className="booking-title text-center mb-4">{t('booking.title')}</h2>

        <form onSubmit={handleSubmit} className="booking-form" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          <div style={{ background: '#f9fafb', padding: '15px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <input type="text" name="name" className="form-control vd-input mb-2" placeholder={t('booking.namePlaceholder')} required disabled={showStripeForm} value={clientData.name} onChange={handleClientChange} />
            {errors.name && <p style={{ color: '#ef4444', fontSize: '0.85rem' }}>{errors.name}</p>}

            <input type="tel" name="phone" className="form-control vd-input mb-2" placeholder={t('booking.phonePlaceholder')} required disabled={showStripeForm} value={clientData.phone} onChange={handleClientChange} />
            {errors.phone && <p style={{ color: '#ef4444', fontSize: '0.85rem' }}>{errors.phone}</p>}

            <input type="email" name="email" className="form-control vd-input" placeholder={t('booking.emailPlaceholder')} required disabled={showStripeForm} value={clientData.email} onChange={handleClientChange} />
          </div>

          <div>
            <label htmlFor="appointment-notes" className="fw-bold mb-2 d-block">{t('booking.notesLabel')}</label>
            <textarea
              id="appointment-notes"
              className="form-control vd-input"
              rows={3}
              maxLength={2000}
              placeholder={t('booking.notesPlaceholder')}
              disabled={showStripeForm}
              value={appointmentNotes}
              onChange={e => setAppointmentNotes(e.target.value)}
            />
          </div>

          <div>
            <label className="fw-bold mb-2 d-block">{t('booking.selectServices')}</label>
            {errors.service && <div className="text-danger small mb-2">{errors.service}</div>}
            {Object.entries(groupedServices).map(([category, categoryServices]) => (
              <div key={category} className="service-select-group">
                <div className="service-select-group-title">{category}</div>
                {categoryServices.map(srv => (
                  <button
                    key={srv.id}
                    type="button"
                    disabled={showStripeForm}
                    onClick={() => toggleService(srv.id)}
                    className={`service-select-chip${selectedServiceIds.includes(srv.id.toString()) ? ' selected' : ''}`}
                  >
                    {srv.name} ({Number(srv.price).toFixed(2)}€)
                  </button>
                ))}
              </div>
            ))}
            {selectedServiceObjs.length > 0 && (
              <div className="service-select-summary mb-3">
                <span>{selectedServiceObjs.length} {t('booking.servicesSelected')}</span>
                <span>{t('booking.total')}: {totalPrice.toFixed(2)}€ · {totalDuration}λ</span>
              </div>
            )}

            <DatePicker
              selected={formData.date}
              disabled={showStripeForm}
              onChange={(d) => { setFormData({ ...formData, date: d, time: '' }); setErrors({}); setShowStripeForm(false); setPaymentClientSecret(''); }}
              dateFormat="dd/MM/yyyy" minDate={new Date()} filterDate={isOpenWeekday} className="form-control vd-input w-100" placeholderText={t('booking.selectDate')} required
            />
          </div>

          {formData.date && (
            <div>
              <label className="fw-bold mb-2">{t('booking.availableTimes')}</label>
              {errors.time && <div className="text-danger small mb-2">{errors.time}</div>}
              {loadingTimes ? <p className="text-muted">{t('booking.searching')}</p> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '10px' }}>
                  {availableTimes.length > 0 ? availableTimes.map(time => (
                    <button key={time} type="button" disabled={showStripeForm} onClick={() => { setFormData({ ...formData, time: time }); setErrors({}); setShowStripeForm(false); setPaymentClientSecret(''); }}
                      className={`time-slot-btn${formData.time === time ? ' selected' : ''}`}>
                      {time}
                    </button>
                  )) : <p className="text-danger small">{t('booking.noAvailableTimes')}</p>}
                </div>
              )}
            </div>
          )}

          {formData.time && (
            <div style={{ background: '#f3f4f6', padding: '15px', borderRadius: '8px' }}>
               <label className="fw-bold mb-2">{t('booking.paymentMethod')}</label>
               <div className="d-flex flex-column gap-2">
                 <label className={`payment-option${formData.payment === 'store' ? ' selected' : ''}`}>
                   <input type="radio" name="payment" value="store" checked={formData.payment === 'store'}
                     onChange={(e) => { setFormData({...formData, payment: e.target.value}); setShowStripeForm(false); setPaymentClientSecret(''); }} />
                   {t('booking.payAtStore')}
                 </label>
                 <label className={`payment-option${formData.payment === 'prepay' ? ' selected' : ''}`}>
                   <input type="radio" name="payment" value="prepay" checked={formData.payment === 'prepay'}
                     onChange={(e) => { setFormData({...formData, payment: e.target.value}); setShowStripeForm(false); setPaymentClientSecret(''); }} />
                   {t('booking.payNow')}
                 </label>
               </div>
            </div>
          )}

          {showStripeForm && paymentClientSecret && selectedServiceObjs.length > 0 ? (
            <Elements stripe={stripePromise} options={{ clientSecret: paymentClientSecret }}>
              <AppointmentPaymentForm totalAmount={totalPrice} clientSecret={paymentClientSecret} payload={getBookingPayload()} setIsSubmitting={setIsSubmitting} isSubmitting={isSubmitting} />
            </Elements>
          ) : (
            <button type="submit" disabled={isSubmitting} className="pay-now-btn">
              {isSubmitting ? (formData.payment === 'prepay' ? t('booking.processingPayment') : t('booking.processing')) : t('booking.confirmBooking')}
            </button>
          )}

        </form>

        <section className="appointment-policy" aria-labelledby="appointment-policy-title">
          <div className="appointment-policy-heading">
            <span aria-hidden="true">✦</span>
            <h3 id="appointment-policy-title">{t('booking.appointmentPolicy.title')}</h3>
            <span aria-hidden="true">✦</span>
          </div>
          <p className="appointment-policy-tagline">{t('booking.appointmentPolicy.tagline')}</p>
          <p>{t('booking.appointmentPolicy.intro')}</p>
          <ol>
            <li>
              <strong>{t('booking.appointmentPolicy.section1Title')}</strong>
              <p>{t('booking.appointmentPolicy.section1Body')}</p>
            </li>
            <li>
              <strong>{t('booking.appointmentPolicy.section2Title')}</strong>
              <p>{t('booking.appointmentPolicy.section2Body')}</p>
            </li>
            <li>
              <strong>{t('booking.appointmentPolicy.section3Title')}</strong>
              <p>{t('booking.appointmentPolicy.section3Body')}</p>
            </li>
          </ol>
          <p>{t('booking.appointmentPolicy.respect')}</p>
          <p className="appointment-policy-thanks">{t('booking.appointmentPolicy.thanks')}</p>
        </section>
      </div>
    </div>
  );
}

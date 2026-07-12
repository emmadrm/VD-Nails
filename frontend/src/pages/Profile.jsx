import React, { useState, useEffect } from 'react';
import '../index.css';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


export default function Profile() {

  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
  const navigate = useNavigate();
  
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('vd_user')));
  const [history, setHistory] = useState({ appointments: [], orders: [] });
  const [loading, setLoading] = useState(true);

  const [isEditingUser, setIsEditingUser] = useState(false);
  const [editUserData, setEditUserData] = useState({ email: '', phone: '' });

  const [rescheduleModal, setRescheduleModal] = useState({ isOpen: false, aptId: null, date: '', time: '' });

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    setEditUserData({ email: user.email, phone: user.phone });
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_URL}/api/user/history/${user.id}`);
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUser = async () => {
    try {
      const res = await fetch(`${API_URL}/api/user/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: editUserData.email, phone: editUserData.phone })
      });
      if (res.ok) {
        const updatedUser = { ...user, email: editUserData.email, phone: editUserData.phone };
        localStorage.setItem('vd_user', JSON.stringify(updatedUser));
        window.dispatchEvent(new Event('storage')); // Ενημερώνει το Header
        setUser(updatedUser);
        setIsEditingUser(false);
      }
    } catch (err) { console.error(err); }
  };

  const getHoursDifference = (dateString, timeString) => {
    const aptDateTime = new Date(`${dateString.split('T')[0]}T${timeString}`);
    return (aptDateTime - new Date()) / (1000 * 60 * 60);
  };

 const cancelAppointment = (apt) => {
  window.scrollTo({ top: 0, behavior: 'smooth' }); // Πηγαίνει ψηλά
  setConfirmDialog({
    isOpen: true,
    title: 'Ακύρωση Ραντεβού',
    message: 'Είστε σίγουροι; Η ενέργεια είναι μη αναστρέψιμη.',
    onConfirm: async () => {
      await fetch(`${API_URL}/api/appointments/${apt.id}`, { method: 'DELETE' });
      toast.success("Το ραντεβού ακυρώθηκε!");
      fetchData();
    }
  });
};

  const openRescheduleModal = (apt) => {
    if (getHoursDifference(apt.appointment_date, apt.appointment_time) < 24) {
      toast.error("Η αλλαγή ραντεβού επιτρέπεται μόνο έως και 24 ώρες πριν.");
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Πηγαίνει ψηλά
    setRescheduleModal({ isOpen: true, aptId: apt.id, date: apt.appointment_date.slice(0,10), time: apt.appointment_time.slice(0,5) });
  };

  const submitReschedule = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/booked-times?date=${rescheduleModal.date}`);
      const bookedSlots = await res.json();
      
      const response = await fetch(`${API_URL}/api/appointments/${rescheduleModal.aptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          appointment_date: rescheduleModal.date, 
          appointment_time: rescheduleModal.time 
        })
      });

      if (response.ok) {
        toast.success("Το ραντεβού μετατέθηκε επιτυχώς!");
        setRescheduleModal({ isOpen: false, aptId: null, date: '', time: '' });
        fetchData();
      } else {
        const errData = await response.json();
        toast.error("Σφάλμα: " + errData.error);
      }
    } catch (err) {
      console.error(err);
      toast.error("Σφάλμα επικοινωνίας.");
    } finally {
      setLoading(false);
    }
  };

const cancelOrder = (orderId) => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
  setConfirmDialog({
    isOpen: true,
    title: 'Ακύρωση Παραγγελίας',
    message: 'Είστε σίγουροι ότι θέλετε να ακυρώσετε αυτή την παραγγελία; Η ενέργεια αυτή δεν αναιρείται.',
    onConfirm: async () => {
      try {
        const res = await fetch(`${API_URL}/api/orders/${orderId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'cancelled' })
        });
        
        if (res.ok) {
          toast.success("Η παραγγελία ακυρώθηκε επιτυχώς.");
          fetchData();
        } else {
          toast.error("Δεν ήταν δυνατή η ακύρωση της παραγγελίας.");
        }
      } catch (err) {
        toast.error("Σφάλμα σύνδεσης με τον server.");
      }
    }
  });
};

  if (!user) return null;
  if (loading) return <div className="pro-loader">Φόρτωση δεδομένων...</div>;

  return (
    <div className="pro-layout">
      {/* ΠΡΟΣΩΠΙΚΑ ΣΤΟΙΧΕΙΑ */}
      <div className="pro-panel">
        <div className="pro-panel-header">
          <h2>Προσωπικά Στοιχεία</h2>
          {!isEditingUser && <button className="pro-link-btn" onClick={() => setIsEditingUser(true)}>Επεξεργασία</button>}
        </div>
        
        {isEditingUser ? (
          <div className="pro-form-grid">
            <div className="pro-input-group">
              <label>Ονοματεπώνυμο</label>
              <input type="text" value={user.name} disabled className="pro-input disabled" />
            </div>
            <div className="pro-input-group">
              <label>Email</label>
              <input type="email" value={editUserData.email} onChange={(e) => setEditUserData({...editUserData, email: e.target.value})} className="pro-input" />
            </div>
            <div className="pro-input-group">
              <label>Τηλέφωνο</label>
              <input type="text" value={editUserData.phone} onChange={(e) => setEditUserData({...editUserData, phone: e.target.value})} className="pro-input" />
            </div>
            <div className="pro-form-actions">
              <button className="pro-btn primary" onClick={handleSaveUser}>Αποθήκευση</button>
              <button className="pro-btn secondary" onClick={() => setIsEditingUser(false)}>Ακύρωση</button>
            </div>
          </div>
        ) : (
          <div className="pro-info-grid">
            <div><label>Ονοματεπώνυμο</label><p>{user.name}</p></div>
            <div><label>Email</label><p>{user.email}</p></div>
            <div><label>Τηλέφωνο</label><p>{user.phone}</p></div>
          </div>
        )}
      </div>

      <div className="pro-split-layout">
        {/* ΡΑΝΤΕΒΟΥ */}
        <div className="pro-panel">
          <h2>Ιστορικό Ραντεβού</h2>
          {history.appointments.length === 0 ? <p className="pro-empty">Δεν βρέθηκαν ραντεβού.</p> : (
            <div className="pro-list">
              {history.appointments.map(apt => (
                <div key={apt.id} className="pro-list-item">
                  <div className="pro-item-details">
                    <span className="pro-service-name">{apt.service_name}</span>
                    <span className="pro-date">{apt.appointment_date.slice(0,10)} | {apt.appointment_time.slice(0,5)}</span>
                  </div>
                  <div className="pro-item-actions">
                    <button className="pro-link-btn" onClick={() => openRescheduleModal(apt)}>Μετάθεση</button>
                    <button className="pro-link-btn danger" onClick={() => cancelAppointment(apt)}>Ακύρωση</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ΠΑΡΑΓΓΕΛΙΕΣ */}
        <div className="pro-panel">
          <h2>Ιστορικό Παραγγελιών</h2>
          {history.orders.length === 0 ? <p className="pro-empty">Δεν βρέθηκαν παραγγελίες.</p> : (
            <div className="pro-list">
              {history.orders.map(order => (
                <div key={order.id} className="pro-list-item order-card">
                  <div className="order-top">
                    <span className="order-id">Παραγγελία #{order.id}</span>
                    <span className={`pro-badge ${order.status || 'pending'}`}>{(order.status || 'pending').toUpperCase()}</span>
                  </div>
                  
                  {/* ΕΜΦΑΝΙΣΗ ΠΡΟΙΟΝΤΩΝ */}
                  <div className="order-products">
                    {order.products && (typeof order.products === 'string' ? JSON.parse(order.products) : order.products).map((p, i) => (
                      <div key={i} className="product-row">
                        <span className="product-qty">{p.qty}x</span> {p.name}
                      </div>
                    ))}
                  </div>

                  <div className="order-bottom">
                    <span className="order-total">{Number(order.total_amount).toFixed(2)}€</span>
                    {(order.status === 'pending' || !order.status) && (
                      <button className="pro-link-btn danger" onClick={() => cancelOrder(order.id)}>Ακύρωση Παραγγελίας</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL ΜΕΤΑΘΕΣΗΣ */}
      {rescheduleModal.isOpen && (
        <div className="pro-modal-overlay">
          <div className="pro-modal">
            <h3>Επιλογή νέας ώρας</h3>
            <input type="date" className="pro-input" value={rescheduleModal.date} onChange={(e) => setRescheduleModal({...rescheduleModal, date: e.target.value})} />
            <div className="time-slots-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '15px' }}>
              {['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'].map(time => (
                <button key={time} className={`time-slot ${rescheduleModal.time === time ? 'selected' : ''}`} onClick={() => setRescheduleModal({...rescheduleModal, time})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd', background: rescheduleModal.time === time ? '#bc9c82' : '#fff' }}>{time}</button>
              ))}
            </div>
            <div className="pro-modal-actions">
              <button className="pro-btn primary" onClick={submitReschedule} disabled={loading}>{loading ? '...' : 'Επιβεβαίωση'}</button>
              <button className="pro-btn secondary" onClick={() => setRescheduleModal({...rescheduleModal, isOpen: false})}>Άκυρο</button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DIALOG - ΠΙΟ ΚΑΘΑΡΟ */}
      {confirmDialog.isOpen && (
        <div className="pro-modal-overlay">
          <div className="pro-modal" style={{ textAlign: 'center' }}>
            <h3>{confirmDialog.title}</h3>
            <p>{confirmDialog.message}</p>
            <div className="pro-modal-actions" style={{ justifyContent: 'center' }}>
              <button className="pro-btn primary" onClick={() => { confirmDialog.onConfirm(); setConfirmDialog({...confirmDialog, isOpen: false}); }}>Ναι, Επιβεβαίωση</button>
              <button className="pro-btn secondary" onClick={() => setConfirmDialog({...confirmDialog, isOpen: false})}>Άκυρο</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
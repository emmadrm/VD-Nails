import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../index.css'; 

export default function Admin() {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  // Tabs
  const [activeTab, setActiveTab] = useState('appointments');
  const [appointments, setAppointments] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);

  // Φίλτρα για τα ραντεβού
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Φόρμες Διαχείρισης
  const [productForm, setProductForm] = useState({
    id: null, name: '', description: '', price: '', image_url: '', stock: 10
  });

  const [serviceForm, setServiceForm] = useState({
    id: null, category: 'Χέρια', name: '', description: '', price: '', duration_minutes: 60
  });

  const [editingApt, setEditingApt] = useState(null);

  const [blockForm, setBlockForm] = useState({
    date: '',
    time: '09:00',
    duration: 60,
    reason: 'Ρεπό / Προσωπικός Χρόνος'
  });

  // --- BI STATS STATES ---
  const [statsRange, setStatsRange] = useState('1m'); 
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [salesStats, setSalesStats] = useState(null);
  const [appointmentStats, setAppointmentStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('adminToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const handleAuthError = (status) => {
    if (status === 401 || status === 403) {
      localStorage.removeItem('adminToken');
      navigate('/vd-admin-12xE5'); 
    }
  };

  useEffect(() => {
    if (!localStorage.getItem('adminToken')) {
      navigate('/notfound');
      return;
    }
    fetchAppointments();
    fetchOrders();
    fetchProducts();
    fetchServices();
  }, [navigate]);

  // --- ΣΤΑΤΙΣΤΙΚΑ (BI) EFFECT & FETCH ---
  useEffect(() => {
    if (activeTab !== 'stats') return;
    calculateDatesAndFetch();
  }, [activeTab, statsRange, customStartDate, customEndDate]);

  const calculateDatesAndFetch = () => {
    let start = new Date();
    let end = new Date();

    if (statsRange === '1m') start.setMonth(start.getMonth() - 1);
    else if (statsRange === '3m') start.setMonth(start.getMonth() - 3);
    else if (statsRange === '6m') start.setMonth(start.getMonth() - 6);
    else if (statsRange === '1y') start.setFullYear(start.getFullYear() - 1);
    else if (statsRange === 'custom') {
      if (!customStartDate || !customEndDate) return;
      fetchData(customStartDate, customEndDate);
      return;
    }

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    fetchData(startStr, endStr);
  };

  const fetchData = async (start, end) => {
    setLoadingStats(true);
    try {
      const [salesRes, aptRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/stats/sales?startDate=${start}&endDate=${end}`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/admin/stats/appointments?startDate=${start}&endDate=${end}`, { headers: getAuthHeaders() })
      ]);

      if (salesRes.ok && aptRes.ok) {
        setSalesStats(await salesRes.json());
        setAppointmentStats(await aptRes.json());
      }
    } catch (err) {
      console.error("Σφάλμα BI φόρτωσης:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  // --- FETCH ΔΕΔΟΜΕΝΩΝ ---
  const fetchAppointments = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/appointments`, { headers: getAuthHeaders() });
      if (!res.ok) return handleAuthError(res.status);
      const data = await res.json();
      setAppointments(data);
    } catch (err) { console.error(err); }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/orders`, { headers: getAuthHeaders() });
      if (!res.ok) return handleAuthError(res.status);
      const data = await res.json();
      setOrders(data);
    } catch (err) { console.error(err); }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_URL}/api/products`, { headers: getAuthHeaders() });
      const data = await res.json();
      setProducts(data);
    } catch (err) { console.error(err); }
  };

  const fetchServices = async () => {
    try {
      const res = await fetch(`${API_URL}/api/services`, { headers: getAuthHeaders() });
      const data = await res.json();
      setServices(data);
    } catch (err) { console.error(err); }
  };

  // --- ΔΙΑΧΕΙΡΙΣΗ ΠΡΟΪΟΝΤΩΝ ---
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const isEdit = !!productForm.id;
    const url = isEdit ? `${API_URL}/api/products/${productForm.id}` : `${API_URL}/api/products`;
    try {
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(productForm)
      });
      if (!res.ok) return handleAuthError(res.status);
      setProductForm({ id: null, name: '', description: '', price: '', image_url: '', stock: 10 });
      fetchProducts();
    } catch (err) { console.error(err); }
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm("🚨 Διαγραφή προϊόντος;")) {
      try {
        const res = await fetch(`${API_URL}/api/products/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        if (!res.ok) return handleAuthError(res.status);
        fetchProducts();
      } catch (err) { console.error(err); }
    }
  };

  // --- ΔΙΑΧΕΙΡΙΣΗ ΥΠΗΡΕΣΙΩΝ ---
  const handleSaveService = async (e) => {
    e.preventDefault();
    const isEdit = !!serviceForm.id;
    const url = isEdit ? `${API_URL}/api/services/${serviceForm.id}` : `${API_URL}/api/services`;
    try {
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(serviceForm)
      });
      if (!res.ok) return handleAuthError(res.status);
      setServiceForm({ id: null, category: 'Χέρια', name: '', description: '', price: '', duration_minutes: 60 });
      fetchServices();
    } catch (err) { console.error(err); }
  };

  const handleDeleteService = async (id) => {
    if (window.confirm("🚨 Διαγραφή υπηρεσίας;")) {
      try {
        const res = await fetch(`${API_URL}/api/services/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        if (!res.ok) return handleAuthError(res.status);
        fetchServices();
      } catch (err) { console.error(err); }
    }
  };

  // --- ΕΠΕΞΕΡΓΑΣΙΑ ΡΑΝΤΕΒΟΥ ---
  const handleUpdateAppointment = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/appointments/${editingApt.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          client_name: editingApt.client_name,
          client_phone: editingApt.client_phone,
          client_email: editingApt.client_email,
          appointment_date: editingApt.appointment_date.slice(0, 10),
          appointment_time: editingApt.appointment_time.slice(0, 5),
          service_name: editingApt.service_name
        })
      });
      if (!res.ok) return handleAuthError(res.status);
      toast.success("✅ Το ραντεβού ενημερώθηκε επιτυχώς!");
      setEditingApt(null);
      fetchAppointments();
    } catch (err) { console.error(err); }
  };

  const handleDeleteAppointment = async (id) => {
    if (window.confirm("🚨 Ακύρωση/Διαγραφή αυτού του ραντεβού;")) {
      try {
        const res = await fetch(`${API_URL}/api/appointments/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        if (!res.ok) return handleAuthError(res.status);
        fetchAppointments();
      } catch (err) { console.error(err); }
    }
  };

  // --- ΜΠΛΟΚΑΡΙΣΜΑ ΩΡΩΝ / ΡΕΠΟ ---
  const handleBlockTime = async (e) => {
    e.preventDefault();
    if (!blockForm.date) return toast.error("Επιλέξτε ημερομηνία.");

    const payload = {
      client_name: "🔐 ΚΛΕΙΣΤΟ / ΡΕΠΟ",
      client_email: "admin@vdnails.com",
      client_phone: "0000000000",
      service_name: blockForm.reason, 
      appointment_date: blockForm.date,
      appointment_time: blockForm.time,
      payment_method: "store",
      total_amount: 0,
      duration: parseInt(blockForm.duration) 
    };

    try {
      const res = await fetch(`${API_URL}/api/appointments/direct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast.success("🔒 Η ώρα/μέρα κλειδώθηκε! Δεν είναι πλέον διαθέσιμη για τους πελάτες.");
        fetchAppointments();
        setActiveTab('appointments');
      } else {
        toast.error("Κάτι πήγε λάθος.");
      }
    } catch (err) { console.error(err); }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/');
  };

  const handleShipmentToggle = async (id, status) => {
  try {
    const res = await fetch(`${API_URL}/api/admin/orders/update-shipment`, { 
      method: 'POST',
      headers: getAuthHeaders(), 
      body: JSON.stringify({ saleId: id, shipped: status })
    });
    
    if (res.ok) {
      setOrders(orders.map(o => o.id === id ? { ...o, shipped: status } : o));
    }
  } catch (err) {
    console.error("Σφάλμα:", err);
  }
};

  const filteredAppointments = appointments.filter(apt => {
    const matchesSearch = apt.client_name.toLowerCase().includes(searchTerm.toLowerCase()) || apt.service_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = dateFilter ? apt.appointment_date.startsWith(dateFilter) : true;
    return matchesSearch && matchesDate;
  });


  return (
    <div className="admin-wrapper" style={{ padding: '30px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'sans-serif', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', marginBottom: '30px' }}>
        <div>
          <h1 style={{ color: '#3b2b1f', margin: 0, fontSize: '1.8rem', fontWeight: 'bold' }}>VD Nails Suite</h1>
          <p style={{ margin: '5px 0 0 0', color: '#6c757d', fontSize: '0.9rem' }}>Καλώς ήρθες στο κέντρο ελέγχου της επιχείρησής σου.</p>
        </div>
        <button onClick={handleLogout} style={{ background: '#dc3545', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' }}>
          🔒 Ασφαλής Αποσύνδεση
        </button>
      </div>
      
      {/* TABS MENU */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', flexWrap: 'wrap', background: '#fff', padding: '8px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        <button onClick={() => { setActiveTab('appointments'); setEditingApt(null); }} style={{ padding: '12px 24px', background: activeTab === 'appointments' ? '#3b2b1f' : 'transparent', color: activeTab === 'appointments' ? '#fff' : '#495057', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' }}>📅 Ραντεβού ({appointments.length})</button>
        <button onClick={() => { setActiveTab('availability'); setEditingApt(null); }} style={{ padding: '12px 24px', background: activeTab === 'availability' ? '#bc9c82' : 'transparent', color: activeTab === 'availability' ? '#fff' : '#495057', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' }}>🔒 Κλείδωμα Ωρών / Ρεπό</button>
        <button onClick={() => { setActiveTab('orders'); setEditingApt(null); }} style={{ padding: '12px 24px', background: activeTab === 'orders' ? '#3b2b1f' : 'transparent', color: activeTab === 'orders' ? '#fff' : '#495057', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' }}>📦 Παραγγελίες ({orders.length})</button>
        <button onClick={() => { setActiveTab('products'); setEditingApt(null); }} style={{ padding: '12px 24px', background: activeTab === 'products' ? '#3b2b1f' : 'transparent', color: activeTab === 'products' ? '#fff' : '#495057', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' }}>🛒 Προϊόντα E-shop</button>
        <button onClick={() => { setActiveTab('services'); setEditingApt(null); }} style={{ padding: '12px 24px', background: activeTab === 'services' ? '#3b2b1f' : 'transparent', color: activeTab === 'services' ? '#fff' : '#495057', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' }}>💅 Υπηρεσίες & Χρόνοι</button>
        <button onClick={() => { setActiveTab('stats'); setEditingApt(null); }} style={{ padding: '12px 24px', background: activeTab === 'stats' ? '#10b981' : 'transparent', color: activeTab === 'stats' ? '#fff' : '#495057', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' }}>📊 Στατιστικά (BI)</button>
      </div>

      {/* ------------------------------------ */}
      {/* TAB 1: ΡΑΝΤΕΒΟΥ */}
      {activeTab === 'appointments' && (
        <div style={{ display: 'grid', gridTemplateColumns: editingApt ? '2fr 1fr' : '1fr', gap: '25px' }}>
          <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
              <h3 style={{ margin: 0, color: '#3b2b1f' }}>Πρόγραμμα & Κρατήσεις</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="text" placeholder="🔍 Αναζήτηση πελάτη/υπηρεσίας..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ced4da', fontSize: '0.9rem' }} />
                <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ced4da', fontSize: '0.9rem' }} />
                {dateFilter && <button onClick={() => setDateFilter('')} style={{ background: '#e9ecef', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}>✖</button>}
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '15px' }}>Πελάτης / Στοιχεία</th>
                  <th style={{ padding: '15px' }}>Υπηρεσία / Λόγος</th>
                  <th style={{ padding: '15px' }}>Ημερομηνία & Ώρα</th>
                  <th style={{ padding: '15px' }}>Τύπος</th>
                  <th style={{ padding: '15px', textAlign: 'right' }}>Ενέργειες</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map(apt => {
                  const isBlocked = apt.client_name === "🔐 ΚΛΕΙΣΤΟ / ΡΕΠΟ";
                  return (
                    <tr key={apt.id} style={{ borderBottom: '1px solid #dee2e6', background: isBlocked ? '#fff3cd' : 'transparent' }}>
                      <td style={{ padding: '15px' }}>
                        <strong style={{ color: isBlocked ? '#856404' : '#212529' }}>{apt.client_name}</strong><br/>
                        {!isBlocked && <small style={{ color: '#6c757d' }}>📱 {apt.client_phone}</small>}
                      </td>
                      <td style={{ padding: '15px' }}>
                        <span style={{ background: isBlocked ? 'transparent' : '#f1ece8', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '500' }}>
                          {apt.service_name}
                        </span>
                      </td>
                      <td style={{ padding: '15px', fontWeight: '500' }}>
                        📅 {apt.appointment_date.slice(0,10)} <span style={{ color: '#dc3545', marginLeft: '5px' }}>⏰ {apt.appointment_time.slice(0,5)}</span>
                      </td>
                      <td style={{ padding: '15px' }}>
                        <small style={{ 
                          padding: '3px 8px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold',
                          background: apt.payment_type?.includes('Stripe') ? '#d1e7dd' : '#e2e3e5',
                          color: apt.payment_type?.includes('Stripe') ? '#0f5132' : '#41464b'
                        }}>
                          {apt.payment_type || 'Κατάστημα'}
                        </small>
                      </td>
                      <td style={{ padding: '15px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end' }}>
                          <button onClick={() => setEditingApt(apt)} style={{ background: '#ffc107', color: '#212529', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500' }}>✏️</button>
                          <button onClick={() => handleDeleteAppointment(apt.id)} style={{ background: '#dc3545', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {editingApt && (
            <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', height: 'fit-content', borderTop: '4px solid #ffc107' }}>
              <h4 style={{ margin: '0 0 20px 0', color: '#3b2b1f' }}>✏️ Επεξεργασία Κράτησης</h4>
              <form onSubmit={handleUpdateAppointment} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Όνομα Πελάτη</label>
                  <input type="text" value={editingApt.client_name} onChange={e => setEditingApt({...editingApt, client_name: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da' }} required />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Τηλέφωνο</label>
                  <input type="tel" value={editingApt.client_phone} onChange={e => setEditingApt({...editingApt, client_phone: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Υπηρεσία</label>
                  <select value={editingApt.service_name} onChange={e => setEditingApt({...editingApt, service_name: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da' }}>
                    {services.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ width: '100%' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Ημερομηνία</label>
                    <input type="date" value={editingApt.appointment_date.slice(0,10)} onChange={e => setEditingApt({...editingApt, appointment_date: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da' }} required />
                  </div>
                  <div style={{ width: '100%' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Ώρα</label>
                    <input type="time" value={editingApt.appointment_time.slice(0,5)} onChange={e => setEditingApt({...editingApt, appointment_time: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da' }} required />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button type="submit" style={{ width: '100%', background: '#10b981', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Αποθήκευση</button>
                  <button type="button" onClick={() => setEditingApt(null)} style={{ width: '100%', background: '#e5e7eb', color: '#495057', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Ακύρωση</button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------ */}
      {/* TAB 2: ΚΛΕΙΔΩΜΑ ΩΡΩΝ / ΡΕΠΟ */}
      {activeTab === 'availability' && (
        <div style={{ maxWidth: '600px', margin: '0 auto', background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', borderTop: '4px solid #bc9c82' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#3b2b1f' }}>🔒 Κλείδωμα Ημερολογίου (Ρεπό / Διαλείμματα)</h3>
          <p style={{ color: '#6c757d', fontSize: '0.9rem', marginBottom: '25px' }}>Επίλεξε μέρα και ώρα που θέλεις να απενεργοποιήσεις. Οι ώρες αυτές θα αφαιρεθούν αυτόματα από τις επιλογές των πελατών σου.</p>
          
          <form onSubmit={handleBlockTime} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px', fontSize: '0.9rem' }}>Ημερομηνία *</label>
              <input type="date" required value={blockForm.date} onChange={e => setBlockForm({...blockForm, date: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da' }} />
            </div>
            
            <div style={{ display: 'flex', gap: '15px' }}>
              <div style={{ width: '100%' }}>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px', fontSize: '0.9rem' }}>Ώρα Έναρξης</label>
                <input type="time" value={blockForm.time} onChange={e => setBlockForm({...blockForm, time: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da' }} />
              </div>
              <div style={{ width: '100%' }}>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px', fontSize: '0.9rem' }}>Διάρκεια Κλειδώματος</label>
                <select value={blockForm.duration} onChange={e => setBlockForm({...blockForm, duration: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da' }}>
                  <option value="30">30 λεπτά (Διάλειμμα)</option>
                  <option value="60">1 ώρα</option>
                  <option value="120">2 ώρες</option>
                  <option value="240">4 ώρες (Μισή Μέρα)</option>
                  <option value="720">12 ώρες (Όλη τη μέρα / Ρεπό)</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px', fontSize: '0.9rem' }}>Αιτιολογία (Φαίνεται μόνο σε εσένα)</label>
              <input type="text" value={blockForm.reason} onChange={e => setBlockForm({...blockForm, reason: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da' }} placeholder="π.χ. Προσωπικό ραντεβού, Ρεπό, Σεμινάριο" />
            </div>

            <button type="submit" style={{ background: '#bc9c82', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', marginTop: '10px' }}>
              🔒 Επιβεβαίωση & Αποκλεισμός Ώρας
            </button>
          </form>
        </div>
      )}

      {/* ------------------------------------ */}
      {/* TAB 3: ΠΑΡΑΓΓΕΛΙΕΣ */}
      {activeTab === 'orders' && (
        <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <h3 style={{ marginBottom: '20px', color: '#3b2b1f' }}>Διαχείριση Παραγγελιών (E-shop)</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                <th style={{ padding: '15px' }}>Πελάτης</th>
                <th style={{ padding: '15px' }}>Προϊόντα</th>
                <th style={{ padding: '15px' }}>Locker BoxNow</th>
                <th style={{ padding: '15px' }}>Σχόλια Πελάτη</th> 
                <th style={{ padding: '15px', textAlign: 'right' }}>Σύνολο</th>
                <th style={{ padding: '15px', textAlign: 'right' }}>Κατάσταση Αποστολής</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '15px' }}>
                    <strong>{order.client_name}</strong><br/>
                    <small style={{ color: '#6c757d' }}>📱 {order.client_phone}</small><br/>
                    <small style={{ color: '#6c757d' }}>✉️ {order.client_email}</small>
                  </td>
                  <td style={{ padding: '15px' }}>
                    {order.products?.map((p, idx) => (
                      <div key={idx} style={{ fontSize: '0.9rem', marginBottom: '3px' }}>
                        📦 <span style={{ fontWeight: 'bold' }}>{p.qty}x</span> - {p.name}
                      </div>
                    ))}
                  </td>
                  <td style={{ padding: '15px', fontSize: '0.85rem', color: '#0056b3', fontWeight: '500' }}>{order.boxnow_locker}</td>
                  <td style={{ padding: '15px', fontSize: '0.85rem', fontStyle: 'italic', color: '#6c757d' }}>{order.customer_notes || '-'}</td>
                  <td style={{ padding: '15px', textAlign: 'right' }}><strong style={{ color: '#10b981', fontSize: '1.1rem' }}>{Number(order.total_amount).toFixed(2)}€</strong></td>
                  <td style={{ padding: '15px', textAlign: 'right' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Σταματάει οποιοδήποτε conflict με το table row
                      handleShipmentToggle(order.id, !order.shipped);
                    }}
                    style={{ 
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      border: 'none',
                      transition: 'all 0.2s ease',
                      backgroundColor: order.shipped ? '#d1e7dd' : '#fff3cd',
                      color: order.shipped ? '#0f5132' : '#856404',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}
                  >
                    {order.shipped ? '✅ Στάλθηκε' : '📦 Εκκρεμεί'}
                  </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ------------------------------------ */}
      {/* TAB 4: ΔΙΑΧΕΙΡΙΣΗ ΠΡΟΪΟΝΤΩΝ */}
      {activeTab === 'products' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
          
          <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', height: 'fit-content' }}>
            <h3 style={{ marginBottom: '20px', color: '#3b2b1f' }}>{productForm.id ? '✏️ Επεξεργασία' : '🛍️ Νέο Προϊόν'}</h3>
            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input type="text" placeholder="Όνομα Προϊόντος" required value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ced4da' }}/>
              <textarea placeholder="Περιγραφή προϊόντος..." value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ced4da', minHeight: '80px' }}/>
              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ width: '100%' }}><label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Τιμή (€)</label><input type="number" step="0.01" required value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da' }}/></div>
                <div style={{ width: '100%' }}><label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Απόθεμα</label><input type="number" required value={productForm.stock} onChange={e => setProductForm({...productForm, stock: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da' }}/></div>
              </div>
              <input type="url" placeholder="URL Φωτογραφίας" required value={productForm.image_url} onChange={e => setProductForm({...productForm, image_url: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ced4da' }}/>
              <button type="submit" style={{ background: '#3b2b1f', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>{productForm.id ? 'Αποθήκευση' : 'Προσθήκη στο E-shop'}</button>
              {productForm.id && <button type="button" onClick={() => setProductForm({ id: null, name: '', description: '', price: '', image_url: '', stock: 10 })} style={{ padding: '10px', background: '#e5e7eb', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Ακύρωση</button>}
            </form>
          </div>

          <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <h3 style={{ marginBottom: '20px', color: '#3b2b1f' }}>Αποθήκη Προϊόντων</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {products.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', border: '1px solid #dee2e6', borderRadius: '10px', background: p.stock <= 2 ? '#f8d7da' : 'transparent' }}>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <img src={p.image_url} alt="img" style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '8px' }} />
                    <div>
                      <strong style={{ fontSize: '1.05rem' }}>{p.name}</strong><br/>
                      <span style={{ color: '#10b981', fontWeight: 'bold' }}>{Number(p.price).toFixed(2)}€</span>
                      <small style={{ marginLeft: '15px', color: p.stock <= 2 ? '#721c24' : '#6c757d', fontWeight: 'bold' }}>Απόθεμα: {p.stock}</small>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setProductForm(p)} style={{ background: '#ffc107', color: '#212529', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>✏️</button>
                    <button onClick={() => handleDeleteProduct(p.id)} style={{ background: '#dc3545', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer' }}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------ */}
      {/* TAB 5: ΔΙΑΧΕΙΡΙΣΗ ΥΠΗΡΕΣΙΩΝ */}
      {activeTab === 'services' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
          
          <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', height: 'fit-content' }}>
            <h3 style={{ marginBottom: '20px', color: '#3b2b1f' }}>{serviceForm.id ? '✏️ Επεξεργασία Χρόνου' : '💅 Νέα Υπηρεσία'}</h3>
            <form onSubmit={handleSaveService} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Κατηγορία Μενού</label>
                <select value={serviceForm.category} onChange={e => setServiceForm({...serviceForm, category: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da' }}>
                  <option value="Χέρια">Χέρια</option>
                  <option value="Πόδια">Πόδια</option>
                  <option value="Πρόσωπο">Πρόσωπο</option>
                </select>
              </div>
              
              <input type="text" required placeholder="Όνομα Υπηρεσίας (π.χ. Ημιμόνιμο με Spa)" value={serviceForm.name} onChange={e => setServiceForm({...serviceForm, name: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ced4da' }}/>
              <textarea placeholder="Περιγραφή υπηρεσίας..." value={serviceForm.description || ''} onChange={e => setServiceForm({...serviceForm, description: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ced4da', minHeight: '80px' }}/>

              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ width: '100%' }}><label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Τιμή (€)</label><input type="number" step="0.01" required value={serviceForm.price} onChange={e => setServiceForm({...serviceForm, price: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da' }}/></div>
                <div style={{ width: '100%' }}><label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Διάρκεια (Λεπτά) *</label>
                  <select value={serviceForm.duration_minutes} onChange={e => setServiceForm({...serviceForm, duration_minutes: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da' }}>
                    <option value="30">30 λεπτά</option>
                    <option value="45">45 λεπτά</option>
                    <option value="60">1 ώρα (60λ)</option>
                    <option value="90">1.5 ώρα (90λ)</option>
                    <option value="120">2 ώρες (120λ)</option>
                    <option value="150">2.5 ώρες (150λ)</option>
                  </select>
                </div>
              </div>
              
              <button type="submit" style={{ background: '#3b2b1f', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>{serviceForm.id ? 'Αποθήκευση Χρόνων' : 'Δημιουργία Υπηρεσίας'}</button>
              {serviceForm.id && <button type="button" onClick={() => setServiceForm({ id: null, category: 'Χέρια', name: '', description: '', price: '', duration_minutes: 60 })} style={{ padding: '10px', background: '#e5e7eb', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Ακύρωση</button>}
            </form>
          </div>

          <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <h3 style={{ marginBottom: '20px', color: '#3b2b1f' }}>Κατάλογος Υπηρεσιών</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {services.map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', border: '1px solid #dee2e6', borderRadius: '10px' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', background: '#e9ecef', padding: '3px 8px', borderRadius: '12px', fontWeight: 'bold', color: '#495057' }}>{s.category}</span>
                    <strong style={{ fontSize: '1.05rem', display: 'block', marginTop: '5px' }}>{s.name}</strong>
                    <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '0.95rem' }}>{Number(s.price).toFixed(2)}€</span>
                    <span style={{ marginLeft: '15px', color: '#dc3545', fontWeight: '500', fontSize: '0.85rem' }}>⏱️ {s.duration_minutes} λεπτά</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setServiceForm(s)} style={{ background: '#ffc107', color: '#212529', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>✏️</button>
                    <button onClick={() => handleDeleteService(s.id)} style={{ background: '#dc3545', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer' }}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------ */}
      {/* TAB 6: ΣΤΑΤΙΣΤΙΚΑ (BI) */}
      {activeTab === 'stats' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          
          {/* ΦΙΛΤΡΑ ΧΡΟΝΙΚΟΥ ΕΥΡΟΥΣ */}
          <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <h3 style={{ margin: 0, color: '#3b2b1f' }}>📊 Φίλτρα Αναλυτικής & Τζίρου</h3>
              <p style={{ margin: '5px 0 0 0', color: '#6c757d', fontSize: '0.85rem' }}>Επίλεξε την περίοδο αναφοράς για τον υπολογισμό των KPIs.</p>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              {['1m', '3m', '6m', '1y'].map(range => (
                <button key={range} onClick={() => setStatsRange(range)} style={{ padding: '8px 16px', border: '1px solid #ced4da', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', background: statsRange === range ? '#3b2b1f' : '#fff', color: statsRange === range ? '#fff' : '#495057' }}>
                  {range === '1m' ? '1 Μήνας' : range === '3m' ? '3μηνο' : range === '6m' ? '6μηνο' : '1 Έτος'}
                </button>
              ))}
              <button onClick={() => setStatsRange('custom')} style={{ padding: '8px 16px', border: '1px solid #ced4da', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', background: statsRange === 'custom' ? '#3b2b1f' : '#fff', color: statsRange === 'custom' ? '#fff' : '#495057' }}>Προσαρμοσμένο</button>
              
              {statsRange === 'custom' && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: '10px' }}>
                  <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #ced4da' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>έως</span>
                  <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #ced4da' }} />
                </div>
              )}
            </div>
          </div>

          {loadingStats ? <p style={{ textAlign: 'center', color: '#6c757d', fontWeight: 'bold' }}>🔄 Υπολογισμός και επεξεργασία δεδομένων BI...</p> : (
            <>
              {/* ΚΑΡΤΕΣ KPIs (KEY PERFORMANCE INDICATORS) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                
                <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', borderLeft: '5px solid #10b981' }}>
                  <small style={{ color: '#6c757d', fontWeight: 'bold', textTransform: 'uppercase' }}>💰 Συνολικά Έσοδα (Πωλήσεις & Υπηρεσίες)</small>
                  <h2 style={{ margin: '10px 0 0 0', fontSize: '1.8rem', color: '#212529' }}>
                    {(Number(salesStats?.summary?.total_revenue || 0) + Number(appointmentStats?.summary?.realized_revenue || 0)).toFixed(2)}€
                  </h2>
                  <p style={{ margin: '5px 0 0 0', fontSize: '0.8rem', color: '#6c757d' }}>
                    🛍️ E-shop: {Number(salesStats?.summary?.total_revenue || 0).toFixed(2)}€ | 💅 Πραγματοποιηθέντα Ραντεβού: {Number(appointmentStats?.summary?.realized_revenue || 0).toFixed(2)}€
                  </p>
                </div>

                <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', borderLeft: '5px solid #bc9c82' }}>
                  <small style={{ color: '#6c757d', fontWeight: 'bold', textTransform: 'uppercase' }}>📅 Pipeline (Μελλοντικά Ραντεβού)</small>
                  <h2 style={{ margin: '10px 0 0 0', fontSize: '1.8rem', color: '#212529' }}>
                    {Number(appointmentStats?.summary?.future_revenue || 0).toFixed(2)}€
                  </h2>
                  <p style={{ margin: '5px 0 0 0', fontSize: '0.8rem', color: '#6c757d' }}>
                    Αξία κλεισμένων ραντεβού για το μέλλον (Booking Pipeline).
                  </p>
                </div>

                <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', borderLeft: '5px solid #0d6efd' }}>
                  <small style={{ color: '#6c757d', fontWeight: 'bold', textTransform: 'uppercase' }}>📦 Παραγγελίες E-shop</small>
                  <h2 style={{ margin: '10px 0 0 0', fontSize: '1.8rem', color: '#212529' }}>{salesStats?.summary?.total_orders || 0} παραγγελίες</h2>
                  <p style={{ margin: '5px 0 0 0', fontSize: '0.8rem', color: '#6c757d' }}>Μέση Αξία: {Number(salesStats?.summary?.average_order_value || 0).toFixed(2)}€</p>
                </div>
              </div>

              {/* ΑΝΑΛΥΤΙΚΟΙ ΠΙΝΑΚΕΣ: BEST SELLERS & TOP ΠΕΛΑΤΕΣ */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '25px' }}>
                
                {/* ΠΙΝΑΚΑΣ 1: BEST SELLERS */}
                <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                  <h4 style={{ margin: '0 0 15px 0', color: '#3b2b1f', borderBottom: '2px solid #f1ece8', paddingBottom: '10px' }}>🏆 Top 5 Προϊόντα & Υπηρεσίες (Best Sellers)</h4>
                  
                  <h5 style={{ margin: '10px 0 5px 0', color: '#0d6efd' }}>🛍️ Προϊόντα E-shop</h5>
                  {salesStats?.bestSellers?.length > 0 ? salesStats.bestSellers.map((p, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee', fontSize: '0.9rem' }}>
                      <span>👑 {idx+1}. <strong>{p.product_name}</strong></span>
                      <span style={{ color: '#6c757d' }}>{p.total_quantity_sold} τεμ. (<span style={{ color: '#10b981', fontWeight: 'bold' }}>{Number(p.total_sales_value).toFixed(2)}€</span>)</span>
                    </div>
                  )) : <p style={{ fontSize: '0.85rem', color: '#6c757d', fontStyle: 'italic' }}>Καμία πώληση σε αυτή την περίοδο.</p>}

                  <h5 style={{ margin: '20px 0 5px 0', color: '#bc9c82' }}>💅 Υπηρεσίες Καταστήματος</h5>
                  {appointmentStats?.topServices?.length > 0 ? appointmentStats.topServices.map((s, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee', fontSize: '0.9rem' }}>
                      <span>⭐ {idx+1}. <strong>{s.service_name}</strong></span>
                      <span style={{ color: '#6c757d' }}>{s.times_booked} κρατήσεις (<span style={{ color: '#10b981', fontWeight: 'bold' }}>{Number(s.total_generated_revenue).toFixed(2)}€</span>)</span>
                    </div>
                  )) : <p style={{ fontSize: '0.85rem', color: '#6c757d', fontStyle: 'italic' }}>Κανένα ραντεβού σε αυτή την περίοδο.</p>}
                </div>

                {/* ΠΙΝΑΚΑΣ 2: TOP ΠΕΛΑΤΕΣ (VIP CLIENTS) */}
                <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                  <h4 style={{ margin: '0 0 15px 0', color: '#3b2b1f', borderBottom: '2px solid #f1ece8', paddingBottom: '10px' }}>💎 VIP Πελάτες (Πιστότητα & Τζίρος)</h4>
                  
                  <h5 style={{ margin: '10px 0 5px 0', color: '#3b2b1f' }}>💖 Κορυφαίοι σε Επισκέψεις (Ραντεβού)</h5>
                  {appointmentStats?.frequentClients?.length > 0 ? appointmentStats.frequentClients.map((c, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee', fontSize: '0.9rem' }}>
                      <div>
                        <strong>{c.client_name}</strong> <br />
                        <small style={{ color: '#6c757d' }}>📱 {c.client_phone}</small>
                      </div>
                      <span style={{ textAlign: 'right', fontWeight: '500' }}>
                        {c.visit_count} επισκέψεις <br />
                        <small style={{ color: '#10b981', fontWeight: 'bold' }}>{Number(c.total_value).toFixed(2)}€</small>
                      </span>
                    </div>
                  )) : <p style={{ fontSize: '0.85rem', color: '#6c757d', fontStyle: 'italic' }}>Δεν υπάρχουν δεδομένα πελατών.</p>}

                  <h5 style={{ margin: '20px 0 5px 0', color: '#3b2b1f' }}>🛒 Κορυφαίοι Αγοραστές (E-shop)</h5>
                  {salesStats?.topCustomers?.length > 0 ? salesStats.topCustomers.map((c, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee', fontSize: '0.9rem' }}>
                      <div>
                        <strong>{c.client_name}</strong> <br />
                        <small style={{ color: '#6c757d' }}>✉️ {c.client_email}</small>
                      </div>
                      <span style={{ textAlign: 'right', fontWeight: '500' }}>
                        {c.order_count} παραγγελίες <br />
                        <small style={{ color: '#10b981', fontWeight: 'bold' }}>{Number(c.total_spent).toFixed(2)}€</small>
                      </span>
                    </div>
                  )) : <p style={{ fontSize: '0.85rem', color: '#6c757d', fontStyle: 'italic' }}>Δεν υπάρχουν δεδομένα αγορών.</p>}
                </div>

              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
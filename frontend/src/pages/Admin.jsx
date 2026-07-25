import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import el from 'date-fns/locale/el';
import '../index.css';

registerLocale('el', el);

export default function Admin() {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  // Βοηθητική συνάρτηση για την αποφυγή μετατόπισης ημερομηνίας (timezone shift)
  const formatLocalDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Ημερήσιο πρόγραμμα (timeline) - ώρες καταστήματος 09:00-21:00
  const TIMELINE_START_HOUR = 9;
  const TIMELINE_END_HOUR = 21;
  const PX_PER_MIN = 2.6;

  const timeToMinutes = (timeStr) => {
    const [h, m] = timeStr.slice(0, 5).split(':').map(Number);
    return h * 60 + m;
  };

  const minutesToTimeLabel = (totalMinutes) => {
    const h = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
    const m = (totalMinutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  const getAptDuration = (apt) => {
    if (apt.duration) return parseInt(apt.duration);
    const svc = services.find(s => s.name === apt.service_name);
    return svc ? svc.duration_minutes : 60;
  };

  // Τοποθετεί τα ραντεβού σε στήλες ώστε τα ταυτόχρονα να εμφανίζονται το ένα δίπλα στο άλλο
  const layoutDayAppointments = (apts) => {
    const events = [...apts]
      .map(apt => {
        const start = timeToMinutes(apt.appointment_time);
        return { apt, start, end: start + getAptDuration(apt) };
      })
      .sort((a, b) => a.start - b.start || a.end - b.end);

    const clusters = [];
    let current = [];
    let currentEnd = -Infinity;
    events.forEach(ev => {
      if (current.length === 0 || ev.start < currentEnd) {
        current.push(ev);
        currentEnd = Math.max(currentEnd, ev.end);
      } else {
        clusters.push(current);
        current = [ev];
        currentEnd = ev.end;
      }
    });
    if (current.length) clusters.push(current);

    const result = [];
    clusters.forEach(cluster => {
      const columnEnds = [];
      cluster.forEach(ev => {
        let col = columnEnds.findIndex(endTime => ev.start >= endTime);
        if (col === -1) { col = columnEnds.length; columnEnds.push(ev.end); }
        else { columnEnds[col] = ev.end; }
        ev.col = col;
      });
      const totalCols = columnEnds.length;
      cluster.forEach(ev => result.push({ ...ev, totalCols }));
    });

    return result;
  };

  // State για το Καθολικό Modal Επιβεβαίωσης
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  // Tabs
  const [activeTab, setActiveTab] = useState('appointments');
  const [appointments, setAppointments] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [users, setUsers] = useState([]);

  // Ημερολόγιο
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(new Date());
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingForm, setBookingForm] = useState({ userId: '', serviceId: '', time: '10:00' });
  const [clientSearchTerm, setClientSearchTerm] = useState('');

  // Ιστορικό Χρηστών
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [selectedUserHistory, setSelectedUserHistory] = useState(null);
  const [loadingUserHistory, setLoadingUserHistory] = useState(false);

  // Φίλτρα
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [orderSearchTerm, setOrderSearchTerm] = useState(''); // Νέο state για αναζήτηση παραγγελιών

  // Φόρμες Διαχείρισης
  const [productForm, setProductForm] = useState({
    id: null, name: '', description: '', price: '', imageFile: null, stock: 10, category: 'Γενικά'
  });

  const [serviceForm, setServiceForm] = useState({
    id: null, category: 'Χέρια', name: '', description: '', price: '', duration_minutes: 60
  });

  const [editingApt, setEditingApt] = useState(null);

  const [blockForm, setBlockForm] = useState({
    date: '', time: '09:00', duration: 60, reason: 'Ρεπό / Προσωπικός Χρόνος'
  });

  // BI STATS
  const [statsRange, setStatsRange] = useState('1m'); 
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [salesStats, setSalesStats] = useState(null);
  const [appointmentStats, setAppointmentStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const getAuthHeaders = () => {
    return { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` };
  };

  const getJsonHeaders = () => {
    return { 'Content-Type': 'application/json', ...getAuthHeaders() };
  };

  const handleAuthError = (status) => {
    if (status === 401 || status === 403) {
      localStorage.removeItem('adminToken');
      navigate('/notfound'); 
    }
  };

  // --- HELPER ΓΙΑ MODAL ΕΠΙΒΕΒΑΙΩΣΗΣ ---
  const triggerConfirm = (title, message, actionCallback) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm: async () => {
        await actionCallback();
        setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null });
      }
    });
  };

  useEffect(() => {
    if (!localStorage.getItem('adminToken')) { navigate('/notfound'); return; }
    fetchAppointments(); fetchOrders(); fetchProducts(); fetchServices(); fetchUsers();
  }, [navigate]);

  useEffect(() => {
    if (activeTab !== 'stats') return;
    calculateDatesAndFetch();
  }, [activeTab, statsRange, customStartDate, customEndDate]);

  const calculateDatesAndFetch = () => {
    let start = new Date(); let end = new Date();
    if (statsRange === '1m') start.setMonth(start.getMonth() - 1);
    else if (statsRange === '3m') start.setMonth(start.getMonth() - 3);
    else if (statsRange === '6m') start.setMonth(start.getMonth() - 6);
    else if (statsRange === '1y') start.setFullYear(start.getFullYear() - 1);
    else if (statsRange === 'custom') {
      if (!customStartDate || !customEndDate) return;
      fetchData(customStartDate, customEndDate); return;
    }
    fetchData(start.toISOString().split('T')[0], end.toISOString().split('T')[0]);
  };

  const fetchData = async (start, end) => {
    setLoadingStats(true);
    try {
      const [salesRes, aptRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/stats/sales?startDate=${start}&endDate=${end}`, { headers: getJsonHeaders() }),
        fetch(`${API_URL}/api/admin/stats/appointments?startDate=${start}&endDate=${end}`, { headers: getJsonHeaders() })
      ]);
      if (salesRes.ok && aptRes.ok) {
        setSalesStats(await salesRes.json());
        setAppointmentStats(await aptRes.json());
      }
    } catch (err) { toast.error("Σφάλμα φόρτωσης στατιστικών."); } 
    finally { setLoadingStats(false); }
  };

  const fetchAppointments = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/appointments`, { headers: getJsonHeaders() });
      if (!res.ok) return handleAuthError(res.status);
      setAppointments(await res.json());
    } catch (err) { toast.error("Σφάλμα φόρτωσης ραντεβού."); }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/orders`, { headers: getJsonHeaders() });
      if (!res.ok) return handleAuthError(res.status);
      setOrders(await res.json());
    } catch (err) { toast.error("Σφάλμα φόρτωσης παραγγελιών."); }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_URL}/api/products`, { headers: getJsonHeaders() });
      setProducts(await res.json());
    } catch (err) { toast.error("Σφάλμα φόρτωσης προϊόντων."); }
  };

  const fetchServices = async () => {
    try {
      const res = await fetch(`${API_URL}/api/services`, { headers: getJsonHeaders() });
      setServices(await res.json());
    } catch (err) { toast.error("Σφάλμα φόρτωσης υπηρεσιών."); }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users`, { headers: getJsonHeaders() });
      if (!res.ok) return handleAuthError(res.status);
      setUsers(await res.json());
    } catch (err) { toast.error("Σφάλμα φόρτωσης χρηστών."); }
  };

  const fetchUserHistory = async (user) => {
    setLoadingUserHistory(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${user.id}/history`, { headers: getJsonHeaders() });
      if (!res.ok) return handleAuthError(res.status);
      const data = await res.json();
      setSelectedUserHistory({ user, ...data });
    } catch (err) { toast.error("Σφάλμα φόρτωσης ιστορικού."); }
    finally { setLoadingUserHistory(false); }
  };

  // --- ΔΙΑΧΕΙΡΙΣΗ ΠΡΟΪΟΝΤΩΝ (FILE UPLOAD) ---
  const handleSaveProduct = (e) => {
    e.preventDefault();
    triggerConfirm("Αποθήκευση Προϊόντος", "Είστε σίγουροι για την προσθήκη/ενημέρωση αυτού του προϊόντος στο E-shop;", async () => {
      const isEdit = !!productForm.id;
      const url = isEdit ? `${API_URL}/api/products/${productForm.id}` : `${API_URL}/api/products`;
      
      const formData = new FormData();
      formData.append('name', productForm.name);
      formData.append('description', productForm.description);
      formData.append('price', productForm.price);
      formData.append('stock', productForm.stock);
      formData.append('category', productForm.category || 'Γενικά');
      if (productForm.imageFile) formData.append('image', productForm.imageFile);

      try {
        const res = await fetch(url, {
          method: isEdit ? 'PUT' : 'POST',
          headers: getAuthHeaders(),
          body: formData
        });
        if (!res.ok) throw new Error("Σφάλμα");
        toast.success("Το προϊόν αποθηκεύτηκε επιτυχώς!");
        setProductForm({ id: null, name: '', description: '', price: '', imageFile: null, stock: 10, category: 'Γενικά' });
        fetchProducts();
      } catch (err) { toast.error("Αποτυχία αποθήκευσης προϊόντος."); }
    });
  };

  const handleDeleteProduct = (id) => {
    triggerConfirm("Διαγραφή Προϊόντος", "Η διαγραφή του προϊόντος είναι οριστική. Να προχωρήσω;", async () => {
      try {
        const res = await fetch(`${API_URL}/api/products/${id}`, { method: 'DELETE', headers: getJsonHeaders() });
        if (!res.ok) throw new Error("Σφάλμα");
        toast.success("🗑️ Το προϊόν διεγράφη.");
        fetchProducts();
      } catch (err) { toast.error("Σφάλμα διαγραφής."); }
    });
  };

  // --- ΔΙΑΧΕΙΡΙΣΗ ΥΠΗΡΕΣΙΩΝ ---
  const handleSaveService = (e) => {
    e.preventDefault();
    triggerConfirm("Αποθήκευση Υπηρεσίας", "Επιβεβαίωση αλλαγών στις υπηρεσίες;", async () => {
      const isEdit = !!serviceForm.id;
      const url = isEdit ? `${API_URL}/api/services/${serviceForm.id}` : `${API_URL}/api/services`;
      try {
        const res = await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: getJsonHeaders(), body: JSON.stringify(serviceForm) });
        if (!res.ok) throw new Error("Σφάλμα");
        toast.success("Η υπηρεσία αποθηκεύτηκε.");
        setServiceForm({ id: null, category: 'Χέρια', name: '', description: '', price: '', duration_minutes: 60 });
        fetchServices();
      } catch (err) { toast.error("Σφάλμα αποθήκευσης."); }
    });
  };

  const handleDeleteService = (id) => {
    triggerConfirm("Διαγραφή Υπηρεσίας", "Προσοχή: Αυτό μπορεί να επηρεάσει προηγούμενα στατιστικά. Διαγραφή;", async () => {
      try {
        const res = await fetch(`${API_URL}/api/services/${id}`, { method: 'DELETE', headers: getJsonHeaders() });
        if (!res.ok) throw new Error("Σφάλμα");
        toast.success("🗑️ Η υπηρεσία διεγράφη.");
        fetchServices();
      } catch (err) { toast.error("Σφάλμα διαγραφής."); }
    });
  };

  // --- ΕΠΕΞΕΡΓΑΣΙΑ ΡΑΝΤΕΒΟΥ ---
  const handleUpdateAppointment = (e) => {
    e.preventDefault();
    triggerConfirm("Ενημέρωση Κράτησης", "Είστε σίγουροι για την τροποποίηση αυτού του ραντεβού;", async () => {
      try {
        const res = await fetch(`${API_URL}/api/appointments/${editingApt.id}`, {
          method: 'PUT',
          headers: getJsonHeaders(),
          body: JSON.stringify({
            client_name: editingApt.client_name, client_phone: editingApt.client_phone,
            client_email: editingApt.client_email, appointment_date: formatLocalDate(editingApt.appointment_date),
            appointment_time: editingApt.appointment_time.slice(0, 5), service_name: editingApt.service_name
          })
        });
        if (!res.ok) throw new Error("Σφάλμα");
        toast.success("Το ραντεβού ενημερώθηκε!");
        setEditingApt(null);
        fetchAppointments();
      } catch (err) { toast.error("Σφάλμα ενημέρωσης ραντεβού."); }
    });
  };

  const handleDeleteAppointment = (id) => {
    triggerConfirm("Ακύρωση Κράτησης", "Είστε σίγουροι ότι θέλετε να ακυρώσετε και να διαγράψετε αυτό το ραντεβού;", async () => {
      try {
        const res = await fetch(`${API_URL}/api/appointments/${id}`, { method: 'DELETE', headers: getJsonHeaders() });
        if (!res.ok) throw new Error("Σφάλμα");
        toast.success("Το ραντεβού ακυρώθηκε.");
        fetchAppointments();
      } catch (err) { toast.error("Σφάλμα κατά την ακύρωση."); }
    });
  };

  // --- ΜΠΛΟΚΑΡΙΣΜΑ ΩΡΩΝ / ΡΕΠΟ ---
  const handleBlockTime = (e) => {
    e.preventDefault();
    if (!blockForm.date) return toast.error("Επιλέξτε ημερομηνία.");

    triggerConfirm("Κλείδωμα Ημερολογίου", `Θα κλειδώσετε την ημέρα ${blockForm.date} στις ${blockForm.time} για ${blockForm.duration} λεπτά. Να προχωρήσω;`, async () => {
      const payload = {
        client_name: "🔐 ΚΛΕΙΣΤΟ / ΡΕΠΟ",
        client_email: "admin@vdnails.com",
        client_phone: "0000000000",
        service_name: blockForm.reason, 
        appointment_date: blockForm.date,
        appointment_time: blockForm.time,
        payment_method: "store",
        payment_status: "completed",
        status: "confirmed", 
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
          toast.success("🔒 Η ώρα/μέρα κλειδώθηκε επιτυχώς!");
          fetchAppointments();
          setActiveTab('appointments');
        } else {
          toast.error("Κάτι πήγε λάθος.");
        }
      } catch (err) { toast.error("Σφάλμα σύνδεσης με server."); }
    });
  };

  // --- ΚΡΑΤΗΣΗ ΡΑΝΤΕΒΟΥ ΓΙΑ ΠΕΛΑΤΙΣΣΑ (ΑΠΟ ΗΜΕΡΟΛΟΓΙΟ) ---
  const handleBookForClient = (e) => {
    e.preventDefault();
    const client = users.find(u => u.id === parseInt(bookingForm.userId));
    const service = services.find(s => s.id === parseInt(bookingForm.serviceId));
    if (!client || !service) return toast.error("Επιλέξτε πελάτισσα και υπηρεσία.");

    const dateStr = formatLocalDate(selectedCalendarDay);
    triggerConfirm("Νέα Κράτηση", `Κλείσιμο ραντεβού για ${client.name} στις ${dateStr.split('-').reverse().join('/')} στις ${bookingForm.time};`, async () => {
      try {
        const res = await fetch(`${API_URL}/api/appointments/direct`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: client.id,
            client_name: client.name,
            client_email: client.email,
            client_phone: client.phone,
            service_name: service.name,
            service_price: service.price,
            appointment_date: dateStr,
            appointment_time: bookingForm.time,
            payment_method: 'store',
            duration: service.duration_minutes
          })
        });
        if (!res.ok) throw new Error();
        toast.success("Το ραντεβού καταχωρήθηκε!");
        setShowBookingForm(false);
        setBookingForm({ userId: '', serviceId: '', time: '10:00' });
        setClientSearchTerm('');
        fetchAppointments();
      } catch (err) { toast.error("Σφάλμα κατά την καταχώρηση του ραντεβού."); }
    });
  };

  // --- ΑΠΟΣΤΟΛΗ ΠΑΡΑΓΓΕΛΙΑΣ ---
  const handleShipmentToggle = (id, status) => {
    triggerConfirm("Ενημέρωση Αποστολής", `Επιβεβαιώνετε ότι η παραγγελία είναι πλέον ${status ? 'Απεσταλμένη' : 'Σε Εκκρεμότητα'};`, async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/orders/update-shipment`, { 
          method: 'POST', headers: getJsonHeaders(), body: JSON.stringify({ saleId: id, shipped: status })
        });
        if (res.ok) {
          toast.success(`Η παραγγελία σημειώθηκε ως ${status ? 'Απεσταλμένη' : 'Εκκρεμής'}.`);
          setOrders(orders.map(o => o.id === id ? { ...o, shipped: status } : o));
        } else {
          toast.error("Αποτυχία ενημέρωσης.");
        }
      } catch (err) { toast.error("Σφάλμα σύνδεσης."); }
    });
  };

  const handleLogout = () => {
    triggerConfirm("Αποσύνδεση", "Είστε σίγουροι ότι θέλετε να αποσυνδεθείτε από το Admin Panel;", () => {
      localStorage.removeItem('adminToken');
      navigate('/');
    });
  };

  const filteredAppointments = appointments.filter(apt => {
    const matchesSearch = apt.client_name.toLowerCase().includes(searchTerm.toLowerCase()) || apt.service_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = dateFilter ? formatLocalDate(apt.appointment_date) === dateFilter : true;
    return matchesSearch && matchesDate;
  });

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.id.toString().includes(orderSearchTerm) || 
      order.client_name.toLowerCase().includes(orderSearchTerm.toLowerCase());
    return matchesSearch;
  });

  const updateAppointmentStatus = (id, status) => {
    triggerConfirm("Ολοκλήρωση Ραντεβού", "Επιβεβαιώνεις ότι το ραντεβού ολοκληρώθηκε επιτυχώς; Θα προσμετρηθεί στα έσοδα.", async () => {
      try {
        const res = await fetch(`${API_URL}/api/appointments/${id}/status`, { 
          method: 'PUT', headers: getJsonHeaders(), body: JSON.stringify({ status }) 
        });
        if (res.ok) {
          toast.success("Το ραντεβού καταχωρήθηκε ως ολοκληρωμένο!");
          fetchAppointments();
        }
      } catch (err) { toast.error("Σφάλμα σύνδεσης."); }
    });
  };

  const handleOrderStatusChange = (id, status) => {
    if (status === 'cancelled') {
      return toast.error("Η ακύρωση μπορεί να γίνει μόνο από τον πελάτη ή μέσω διαγραφής.");
    }
    triggerConfirm("Αλλαγή Κατάστασης", `Θέλετε να αλλάξετε την κατάσταση της παραγγελίας; (Θα προστεθεί στα έσοδα αν επιλέξετε 'Παραλήφθηκε')`, async () => {
      try {
        const res = await fetch(`${API_URL}/api/orders/${id}/status`, { 
          method: 'PUT', headers: getJsonHeaders(), body: JSON.stringify({ status }) 
        });
        if (res.ok) {
          toast.success("Η κατάσταση της παραγγελίας ενημερώθηκε!");
          fetchOrders();
        }
      } catch (err) { toast.error("Σφάλμα."); }
    });
  };

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
        <button onClick={() => { setActiveTab('appointments'); setEditingApt(null); }} style={{ padding: '12px 24px', background: activeTab === 'appointments' ? '#3b2b1f' : 'transparent', color: activeTab === 'appointments' ? '#fff' : '#495057', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>📅 Ραντεβού ({appointments.length})</button>
        <button onClick={() => { setActiveTab('calendar'); setEditingApt(null); }} style={{ padding: '12px 24px', background: activeTab === 'calendar' ? '#3b2b1f' : 'transparent', color: activeTab === 'calendar' ? '#fff' : '#495057', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>🗓️ Ημερολόγιο</button>
        <button onClick={() => { setActiveTab('availability'); setEditingApt(null); }} style={{ padding: '12px 24px', background: activeTab === 'availability' ? '#bc9c82' : 'transparent', color: activeTab === 'availability' ? '#fff' : '#495057', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>🔒 Κλείδωμα Ωρών / Ρεπό</button>
        <button onClick={() => { setActiveTab('orders'); setEditingApt(null); }} style={{ padding: '12px 24px', background: activeTab === 'orders' ? '#3b2b1f' : 'transparent', color: activeTab === 'orders' ? '#fff' : '#495057', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>📦 Παραγγελίες ({orders.length})</button>
        <button onClick={() => { setActiveTab('products'); setEditingApt(null); }} style={{ padding: '12px 24px', background: activeTab === 'products' ? '#3b2b1f' : 'transparent', color: activeTab === 'products' ? '#fff' : '#495057', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>🛒 Προϊόντα E-shop</button>
        <button onClick={() => { setActiveTab('services'); setEditingApt(null); }} style={{ padding: '12px 24px', background: activeTab === 'services' ? '#3b2b1f' : 'transparent', color: activeTab === 'services' ? '#fff' : '#495057', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>💅 Υπηρεσίες & Χρόνοι</button>
        <button onClick={() => { setActiveTab('stats'); setEditingApt(null); }} style={{ padding: '12px 24px', background: activeTab === 'stats' ? '#10b981' : 'transparent', color: activeTab === 'stats' ? '#fff' : '#495057', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>📊 Στατιστικά (BI)</button>
        <button onClick={() => { setActiveTab('users'); setEditingApt(null); setSelectedUserHistory(null); }} style={{ padding: '12px 24px', background: activeTab === 'users' ? '#0d6efd' : 'transparent', color: activeTab === 'users' ? '#fff' : '#495057', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>👤 Χρήστες ({users.length})</button>
      </div>

      {/* TAB 1: ΡΑΝΤΕΒΟΥ */}
      {activeTab === 'appointments' && (
        <div style={{ display: 'grid', gridTemplateColumns: editingApt ? '2fr 1fr' : '1fr', gap: '25px' }}>
          <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
              <h3 style={{ margin: 0, color: '#3b2b1f' }}>Πρόγραμμα & Κρατήσεις</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="text" placeholder="🔍 Αναζήτηση πελάτη/υπηρεσίας..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ced4da' }} />
                <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ced4da' }} />
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
                        📅 {formatLocalDate(apt.appointment_date).split('-').reverse().join('/')} <span style={{ color: '#dc3545', marginLeft: '5px' }}>⏰ {apt.appointment_time.slice(0,5)}</span>
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
                          {apt.status !== 'completed' && apt.status !== 'cancelled' && (
                            <button onClick={() => updateAppointmentStatus(apt.id, 'completed')} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }} title="Σήμανση ως Ολοκληρωμένο">✅</button>
                          )}
                          <button onClick={() => setEditingApt(apt)} style={{ background: '#ffc107', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>✏️</button>
                          <button onClick={() => handleDeleteAppointment(apt.id)} style={{ background: '#dc3545', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>🗑️</button>
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
               <div style={{ display: 'flex', gap: '10px' }}>
                 <div style={{ width: '100%' }}>
                   <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Ημερομηνία</label>
                   <input type="date" value={formatLocalDate(editingApt.appointment_date)} onChange={e => setEditingApt({...editingApt, appointment_date: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da' }} required />
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

      {/* TAB: ΗΜΕΡΟΛΟΓΙΟ ΡΑΝΤΕΒΟΥ */}
      {activeTab === 'calendar' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(380px, 450px) 1fr', gap: '25px', alignItems: 'start' }}>
          <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#3b2b1f' }}>🗓️ Ημερολόγιο Ραντεβού</h3>
            <DatePicker
              inline
              locale="el"
              calendarClassName="vd-admin-calendar"
              selected={selectedCalendarDay}
              onChange={(date) => { setSelectedCalendarDay(date); setShowBookingForm(false); }}
              renderDayContents={(day, date) => {
                const dateStr = formatLocalDate(date);
                const count = appointments.filter(a => formatLocalDate(a.appointment_date) === dateStr && a.client_name !== "🔐 ΚΛΕΙΣΤΟ / ΡΕΠΟ").length;
                return (
                  <div style={{ position: 'relative' }}>
                    {day}
                    {count > 0 && (
                      <span style={{ position: 'absolute', top: '-4px', right: '-8px', background: '#10b981', color: '#fff', borderRadius: '50%', fontSize: '0.6rem', width: '15px', height: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                        {count}
                      </span>
                    )}
                  </div>
                );
              }}
            />
          </div>

          <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ margin: 0, color: '#3b2b1f' }}>📋 Ραντεβού: {formatLocalDate(selectedCalendarDay).split('-').reverse().join('/')}</h3>
              <button onClick={() => setShowBookingForm(!showBookingForm)} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                {showBookingForm ? '✖ Ακύρωση' : '+ Νέο Ραντεβού'}
              </button>
            </div>

            {showBookingForm && (
              <form onSubmit={handleBookForClient} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
                <div style={{ position: 'relative' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Πελάτισσα *</label>
                  <input
                    type="text"
                    placeholder="🔍 Αναζήτηση με όνομα, email ή τηλέφωνο..."
                    value={clientSearchTerm}
                    onChange={e => { setClientSearchTerm(e.target.value); setBookingForm({ ...bookingForm, userId: '' }); }}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da' }}
                  />
                  {clientSearchTerm && !bookingForm.userId && (
                    <div style={{ position: 'absolute', zIndex: 10, background: '#fff', border: '1px solid #dee2e6', borderRadius: '6px', maxHeight: '180px', overflowY: 'auto', width: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                      {users.filter(u =>
                        u.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
                        u.email.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
                        u.phone.includes(clientSearchTerm)
                      ).slice(0, 8).map(u => (
                        <div key={u.id} onClick={() => { setBookingForm({ ...bookingForm, userId: u.id }); setClientSearchTerm(`${u.name} (${u.phone})`); }}
                          style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #f1ece8' }}>
                          <strong>{u.name}</strong><br /><small style={{ color: '#6c757d' }}>{u.email} · {u.phone}</small>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Υπηρεσία *</label>
                  <select required value={bookingForm.serviceId} onChange={e => setBookingForm({ ...bookingForm, serviceId: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da' }}>
                    <option value="">-- Επιλέξτε υπηρεσία --</option>
                    {services.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.duration_minutes}λ - {Number(s.price).toFixed(2)}€)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Ώρα *</label>
                  <input type="time" required value={bookingForm.time} onChange={e => setBookingForm({ ...bookingForm, time: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da' }} />
                </div>

                <button type="submit" disabled={!bookingForm.userId} style={{ background: bookingForm.userId ? '#3b2b1f' : '#ced4da', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: bookingForm.userId ? 'pointer' : 'not-allowed' }}>
                  ✅ Καταχώρηση Ραντεβού
                </button>
              </form>
            )}

            {(() => {
              const dayAppointments = appointments.filter(a => formatLocalDate(a.appointment_date) === formatLocalDate(selectedCalendarDay));
              const dayLayout = layoutDayAppointments(dayAppointments);
              const hours = [];
              for (let h = TIMELINE_START_HOUR; h < TIMELINE_END_HOUR; h++) hours.push(h);
              const timelineHeight = (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * 60 * PX_PER_MIN;
              const LABEL_COL_WIDTH = 60;

              return (
                <div style={{ position: 'relative', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                  {hours.map(hour => (
                    <div key={hour} style={{ height: `${60 * PX_PER_MIN}px`, display: 'flex', borderTop: hour !== TIMELINE_START_HOUR ? '1px solid #f1ece8' : 'none' }}>
                      <div style={{ width: `${LABEL_COL_WIDTH}px`, flexShrink: 0, textAlign: 'right', paddingRight: '10px', fontSize: '0.8rem', fontWeight: '600', color: '#6c757d', transform: 'translateY(-8px)' }}>
                        {String(hour).padStart(2, '0')}:00
                      </div>
                      <div style={{ flex: 1, borderLeft: '1px solid #f1ece8' }}>
                        <div
                          onClick={() => { setBookingForm({ ...bookingForm, time: `${String(hour).padStart(2, '0')}:00` }); setShowBookingForm(true); }}
                          style={{ height: '50%', cursor: 'pointer' }}
                        />
                        <div
                          onClick={() => { setBookingForm({ ...bookingForm, time: `${String(hour).padStart(2, '0')}:30` }); setShowBookingForm(true); }}
                          style={{ height: '50%', cursor: 'pointer', borderTop: '1px dashed #f6f2ef' }}
                        />
                      </div>
                    </div>
                  ))}

                  <div style={{ position: 'absolute', top: 0, left: `${LABEL_COL_WIDTH}px`, right: 0, height: `${timelineHeight}px`, pointerEvents: 'none' }}>
                    {dayLayout.map(({ apt, start, end, col, totalCols }) => {
                      const isBlocked = apt.client_name === "🔐 ΚΛΕΙΣΤΟ / ΡΕΠΟ";
                      const top = Math.max(0, (start - TIMELINE_START_HOUR * 60) * PX_PER_MIN);
                      const height = Math.max(40, (end - start) * PX_PER_MIN);
                      const widthPct = 100 / totalCols;
                      const leftPct = col * widthPct;
                      return (
                        <div
                          key={apt.id}
                          title={`${minutesToTimeLabel(start)}–${minutesToTimeLabel(end)} · ${apt.client_name} · ${apt.service_name} (${end - start}λ)`}
                          style={{
                            position: 'absolute',
                            top: `${top}px`,
                            height: `${height}px`,
                            left: `calc(${leftPct}% + 4px)`,
                            width: `calc(${widthPct}% - 8px)`,
                            background: isBlocked ? 'repeating-linear-gradient(45deg, #fff3cd, #fff3cd 6px, #ffe69c 6px, #ffe69c 12px)' : '#f1e4d8',
                            borderLeft: `4px solid ${isBlocked ? '#e0a800' : '#bc9c82'}`,
                            borderRadius: '6px',
                            padding: '5px 9px',
                            fontSize: '0.78rem',
                            lineHeight: 1.35,
                            color: '#3b2b1f',
                            overflow: 'hidden',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                            pointerEvents: 'auto',
                            cursor: 'default'
                          }}
                        >
                          <strong style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{apt.client_name}</strong>
                          <span style={{ display: 'block', color: '#6c757d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {minutesToTimeLabel(start)}–{minutesToTimeLabel(end)} · {end - start}λ
                          </span>
                          {height > 46 && (
                            <span style={{ display: 'block', color: '#8c7a6b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {apt.service_name}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* TAB 2: ΚΛΕΙΔΩΜΑ ΩΡΩΝ */}
      {activeTab === 'availability' && (
        <div style={{ maxWidth: '600px', margin: '0 auto', background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', borderTop: '4px solid #bc9c82' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#3b2b1f' }}>🔒 Κλείδωμα Ημερολογίου</h3>
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
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px', fontSize: '0.9rem' }}>Διάρκεια (Λεπτά)</label>
              <input 
                type="number" 
                min="15" 
                required 
                placeholder="π.χ. 120"
                value={blockForm.duration} 
                onChange={e => setBlockForm({...blockForm, duration: e.target.value})} 
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da' }} 
              />
            </div>
          </div>
          <div>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px', fontSize: '0.9rem' }}>Αιτιολογία</label>
            <input type="text" value={blockForm.reason} onChange={e => setBlockForm({...blockForm, reason: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da' }} />
          </div>
          <button type="submit" style={{ background: '#bc9c82', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>🔒 Κλείδωμα Ώρας</button>
        </form>
      </div>
      )}

      {/* TAB 3: ΠΑΡΑΓΓΕΛΙΕΣ (ΜΕ ΕΛΕΓΧΟ STATUS & ΑΝΑΖΗΤΗΣΗ) */}
      {activeTab === 'orders' && (
        <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
            <h3 style={{ margin: 0, color: '#3b2b1f' }}>Διαχείριση Παραγγελιών (E-shop)</h3>
            <input 
              type="text" 
              placeholder="🔍 Αναζήτηση με κωδικό ή όνομα..." 
              value={orderSearchTerm} 
              onChange={e => setOrderSearchTerm(e.target.value)} 
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ced4da', width: '300px' }} 
            />
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                <th style={{ padding: '15px' }}>Κωδικός / Πελάτης</th>
                <th style={{ padding: '15px' }}>Προϊόντα</th>
                <th style={{ padding: '15px' }}>Locker BoxNow</th>
                <th style={{ padding: '15px', textAlign: 'right' }}>Σύνολο</th>
                <th style={{ padding: '15px', textAlign: 'center' }}>Κατάσταση</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => {
                const isCancelled = order.status === 'cancelled';
                return (
                  <tr key={order.id} style={{ borderBottom: '1px solid #dee2e6', background: isCancelled ? '#f8d7da' : 'transparent' }}>
                    <td style={{ padding: '15px' }}>
                      <span style={{ background: '#e9ecef', padding: '3px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>#{order.id}</span><br />
                      <strong>{order.client_name}</strong><br/>
                      <small style={{ color: '#6c757d' }}>📱 {order.client_phone}</small>
                    </td>
                    <td style={{ padding: '15px' }}>
                      {order.products?.map((p, idx) => (
                        <div key={idx} style={{ fontSize: '0.9rem', marginBottom: '3px' }}>
                          📦 <strong>{p.qty}x</strong> - {p.name}
                        </div>
                      ))}
                    </td>
                    <td style={{ padding: '15px', fontSize: '0.85rem', color: '#0056b3' }}>{order.boxnow_locker}</td>
                    <td style={{ padding: '15px', textAlign: 'right' }}><strong style={{ color: '#10b981' }}>{Number(order.total_amount).toFixed(2)}€</strong></td>
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                      {isCancelled ? (
                        <span style={{ color: '#721c24', fontWeight: 'bold', background: '#f5c6cb', padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem' }}>🚫 Ακυρώθηκε</span>
                      ) : (
                        <select 
                          value={order.status} 
                          onChange={(e) => handleOrderStatusChange(order.id, e.target.value)}
                          style={{ 
                            padding: '6px 10px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', border: 'none', cursor: 'pointer',
                            backgroundColor: order.status === 'completed' ? '#d1e7dd' : order.status === 'shipped' ? '#cff4fc' : order.status === 'cancelled' ? '#f8d7da' : '#fff3cd',
                            color: order.status === 'completed' ? '#0f5132' : order.status === 'shipped' ? '#055160' : order.status === 'cancelled' ? '#842029' : '#856404'
                          }}
                        >
                          <option value="pending">📦 Εκκρεμεί</option>
                          <option value="shipped">🚚 Στάλθηκε</option>
                          <option value="completed">✅ Παραλήφθηκε</option>
                          <option value="cancelled">🚫 Ακυρώθηκε</option>
                        </select>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: ΠΡΟΪΟΝΤΑ (FILE UPLOAD) */}
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

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Κατηγορία</label>
                <input
                  type="text"
                  list="product-categories-list"
                  placeholder="π.χ. Βερνίκια, Εργαλεία..."
                  value={productForm.category}
                  onChange={e => setProductForm({ ...productForm, category: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da' }}
                />
                <datalist id="product-categories-list">
                  {[...new Set(products.map(p => p.category).filter(Boolean))].map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Φωτογραφία Προϊόντος</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={e => setProductForm({...productForm, imageFile: e.target.files[0]})} 
                  style={{ width: '100%', padding: '8px', border: '1px solid #ced4da', borderRadius: '6px' }}
                />
                {!productForm.imageFile && !productForm.id && <small style={{ color: '#dc3545' }}>*Απαιτείται επιλογή αρχείου.</small>}
              </div>

              <button type="submit" style={{ background: '#3b2b1f', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>{productForm.id ? 'Αποθήκευση' : 'Προσθήκη'}</button>
              {productForm.id && <button type="button" onClick={() => setProductForm({ id: null, name: '', description: '', price: '', imageFile: null, stock: 10, category: 'Γενικά' })} style={{ padding: '10px', background: '#e5e7eb', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Ακύρωση</button>}
            </form>
          </div>

          <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <h3 style={{ marginBottom: '20px', color: '#3b2b1f' }}>Αποθήκη Προϊόντων</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {products.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', border: '1px solid #dee2e6', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <img src={p.image_url} alt="img" style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '8px' }} />
                   <div>
                      <strong style={{ fontSize: '1.05rem' }}>{p.name}</strong>
                      <span style={{ marginLeft: '10px', background: '#f1ece8', color: '#3b2b1f', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>{p.category || 'Γενικά'}</span><br/>
                      <span style={{ color: '#10b981', fontWeight: 'bold' }}>{Number(p.price).toFixed(2)}€</span>
                      <small style={{
                        marginLeft: '15px', 
                        color: p.stock <= 2 ? '#721c24' : '#6c757d', 
                        fontWeight: 'bold',
                        background: p.stock <= 2 ? '#f8d7da' : '#e9ecef',
                        padding: '3px 8px',
                        borderRadius: '12px'
                      }}>
                        📦 Απόθεμα: {p.stock}
                      </small>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setProductForm(p)} style={{ background: '#ffc107', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer' }}>✏️</button>
                    <button onClick={() => handleDeleteProduct(p.id)} style={{ background: '#dc3545', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer' }}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
              {['Χέρια', 'Πόδια', 'Πρόσωπο'].map(category => {
                const categoryServices = services.filter(s => s.category === category);
                
                if (categoryServices.length === 0) return null; 

                return (
                  <div key={category}>
                    <h4 style={{ color: '#bc9c82', borderBottom: '2px solid #f1ece8', paddingBottom: '8px', marginBottom: '15px', fontSize: '1.2rem' }}>
                      {category === 'Χέρια' ? '💅' : category === 'Πόδια' ? '👣' : '✨'} {category}
                    </h4>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {categoryServices.map(s => (
                        <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', border: '1px solid #dee2e6', borderRadius: '10px' }}>
                          <div>
                            <strong style={{ fontSize: '1.05rem', display: 'block' }}>{s.name}</strong>
                            <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '0.95rem' }}>{Number(s.price).toFixed(2)}€</span>
                            <span style={{ marginLeft: '15px', color: '#dc3545', fontWeight: '500', fontSize: '0.85rem' }}>⏱️ {s.duration_minutes} λεπτά</span>
                            {s.description && (
                              <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: '#6c757d', fontStyle: 'italic' }}>{s.description}</p>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => setServiceForm(s)} style={{ background: '#ffc107', color: '#212529', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>✏️</button>
                            <button onClick={() => handleDeleteService(s.id)} style={{ background: '#dc3545', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer' }}>🗑️</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              
              {services.filter(s => !['Χέρια', 'Πόδια', 'Πρόσωπο'].includes(s.category)).length > 0 && (
                <div>
                  <h4 style={{ color: '#6c757d', borderBottom: '2px solid #f1ece8', paddingBottom: '8px', marginBottom: '15px', fontSize: '1.2rem' }}>Άλλες Υπηρεσίες</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {services.filter(s => !['Χέρια', 'Πόδια', 'Πρόσωπο'].includes(s.category)).map(s => (
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
              )}
            </div>
          </div>
        </div>
      )}

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
              {/* ΚΑΡΤΕΣ KPIs */}
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

      {/* TAB: ΙΣΤΟΡΙΚΟ ΧΡΗΣΤΩΝ */}
      {activeTab === 'users' && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedUserHistory ? '1.2fr 1fr' : '1fr', gap: '25px' }}>
          <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
              <h3 style={{ margin: 0, color: '#3b2b1f' }}>Εγγεγραμμένοι Χρήστες ({users.length})</h3>
              <input
                type="text"
                placeholder="🔍 Αναζήτηση με όνομα, email ή τηλέφωνο..."
                value={userSearchTerm}
                onChange={e => setUserSearchTerm(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ced4da', width: '300px' }}
              />
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '15px' }}>Στοιχεία</th>
                  <th style={{ padding: '15px' }}>Εγγραφή</th>
                  <th style={{ padding: '15px', textAlign: 'center' }}>Ραντεβού</th>
                  <th style={{ padding: '15px', textAlign: 'center' }}>Παραγγελίες</th>
                  <th style={{ padding: '15px', textAlign: 'right' }}>Ενέργειες</th>
                </tr>
              </thead>
              <tbody>
                {users
                  .filter(u =>
                    u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                    u.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                    u.phone.includes(userSearchTerm)
                  )
                  .map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #dee2e6', background: selectedUserHistory?.user?.id === u.id ? '#f1ece8' : 'transparent' }}>
                      <td style={{ padding: '15px' }}>
                        <strong>{u.name}</strong><br />
                        <small style={{ color: '#6c757d' }}>✉️ {u.email}<br />📱 {u.phone}</small>
                      </td>
                      <td style={{ padding: '15px' }}>{formatLocalDate(u.created_at).split('-').reverse().join('/')}</td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>{u.appointment_count}</td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>{u.order_count}</td>
                      <td style={{ padding: '15px', textAlign: 'right' }}>
                        <button onClick={() => fetchUserHistory(u)} style={{ background: '#3b2b1f', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer' }}>Ιστορικό</button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {selectedUserHistory && (
            <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', height: 'fit-content', borderTop: '4px solid #0d6efd' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h4 style={{ margin: 0, color: '#3b2b1f' }}>📜 Ιστορικό: {selectedUserHistory.user.name}</h4>
                <button onClick={() => setSelectedUserHistory(null)} style={{ background: '#e5e7eb', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' }}>✖</button>
              </div>

              {loadingUserHistory ? <p style={{ textAlign: 'center', color: '#6c757d' }}>🔄 Φόρτωση ιστορικού...</p> : (
                <>
                  <h5 style={{ color: '#bc9c82', margin: '15px 0 10px 0' }}>💅 Ραντεβού ({selectedUserHistory.appointments?.length || 0})</h5>
                  {selectedUserHistory.appointments?.length > 0 ? selectedUserHistory.appointments.map(a => (
                    <div key={a.id} style={{ padding: '10px 0', borderBottom: '1px solid #eee', fontSize: '0.9rem' }}>
                      📅 {formatLocalDate(a.appointment_date).split('-').reverse().join('/')} ⏰ {a.appointment_time.slice(0, 5)} — <strong>{a.service_name}</strong>
                      <br /><small style={{ color: a.status === 'completed' ? '#10b981' : a.status === 'cancelled' ? '#dc3545' : '#6c757d' }}>{a.status}</small>
                    </div>
                  )) : <p style={{ fontSize: '0.85rem', color: '#6c757d', fontStyle: 'italic' }}>Δεν υπάρχουν ραντεβού.</p>}

                  <h5 style={{ color: '#0d6efd', margin: '20px 0 10px 0' }}>🛍️ Παραγγελίες ({selectedUserHistory.orders?.length || 0})</h5>
                  {selectedUserHistory.orders?.length > 0 ? selectedUserHistory.orders.map(o => (
                    <div key={o.id} style={{ padding: '10px 0', borderBottom: '1px solid #eee', fontSize: '0.9rem' }}>
                      #{o.id} — <strong style={{ color: '#10b981' }}>{Number(o.total_amount).toFixed(2)}€</strong><br />
                      <small style={{ color: '#6c757d' }}>{new Date(o.created_at).toLocaleDateString('el-GR')} · {o.status}</small>
                    </div>
                  )) : <p style={{ fontSize: '0.85rem', color: '#6c757d', fontStyle: 'italic' }}>Δεν υπάρχουν παραγγελίες.</p>}
                </>
              )}
            </div>
          )}
        </div>
      )}

      <ToastContainer position="top-right" autoClose={3000} style={{zIndex: 999999 }}/>
      
      {confirmDialog.isOpen && (
        <div className="pro-modal-overlay">
          <div className="pro-modal" style={{ textAlign: 'center' }}>
            <h3 style={{ color: '#3b2b1f', marginBottom: '15px' }}>{confirmDialog.title}</h3>
            <p style={{ color: '#495057', marginBottom: '25px', lineHeight: '1.5' }}>{confirmDialog.message}</p>
            <div className="pro-modal-actions" style={{ justifyContent: 'center' }}>
              <button className="pro-btn primary" onClick={confirmDialog.onConfirm}>Ναι, Επιβεβαίωση</button>
              <button className="pro-btn secondary" onClick={() => setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null })}>Άκυρο</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
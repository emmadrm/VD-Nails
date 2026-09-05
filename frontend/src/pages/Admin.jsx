import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import el from 'date-fns/locale/el';
import '../index.css';
import './admin-theme.css';
import AdminSidebar from '../components/admin/AdminSidebar';
import ServicePicker from '../components/admin/ServicePicker';
import ClientHistoryPanel from '../components/admin/ClientHistoryPanel';
import WeekCalendar from '../components/admin/WeekCalendar';
import {
  IconSearch, IconEdit, IconTrash, IconCheck, IconX, IconClock, IconAlert, IconMenu
} from '../components/admin/icons';

registerLocale('el', el);

const BLOCKED_CLIENT_NAME = "🔐 ΚΛΕΙΣΤΟ / ΡΕΠΟ";
const BLOCKED_LABEL = "Κλειστό / Ρεπό";

const PAGE_META = {
  appointments: { title: 'Λίστα ραντεβού', subtitle: 'Αναζήτηση, φιλτράρισμα και διαχείριση όλων των κρατήσεων.' },
  calendar: { title: 'Ημερολόγιο', subtitle: 'Πρόγραμμα εβδομάδας, ωράριο ανά ημέρα και κλείδωμα χρόνου — όλα σε ένα σημείο.' },
  orders: { title: 'Παραγγελίες', subtitle: 'Διαχείριση παραγγελιών του e-shop.' },
  products: { title: 'Προϊόντα', subtitle: 'Κατάλογος και αποθέματα e-shop.' },
  services: { title: 'Υπηρεσίες', subtitle: 'Κατάλογος υπηρεσιών, τιμές και διάρκειες.' },
  stats: { title: 'Στατιστικά', subtitle: 'Απόδοση επιχείρησης και κορυφαίοι πελάτες.' },
  users: { title: 'Πελάτες', subtitle: 'Εγγεγραμμένοι χρήστες και ιστορικό.' }
};

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

  // State για το Καθολικό Modal Επιβεβαίωσης
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState('appointments');
  const [appointments, setAppointments] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [users, setUsers] = useState([]);

  // Ιστορικό Χρηστών
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [selectedUserHistory, setSelectedUserHistory] = useState(null);
  const [loadingUserHistory, setLoadingUserHistory] = useState(false);

  // Ιστορικό πελάτισσας βάσει τηλεφώνου (από Ραντεβού/Ημερολόγιο, καλύπτει και guest κρατήσεις)
  const [phoneHistory, setPhoneHistory] = useState(null);
  const [loadingPhoneHistory, setLoadingPhoneHistory] = useState(false);

  // Επιλεγμένες υπηρεσίες κατά την επεξεργασία ραντεβού (πολλαπλές υπηρεσίες)
  const [editServices, setEditServices] = useState([]);

  // Φίλτρα
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [orderSearchTerm, setOrderSearchTerm] = useState(''); // Νέο state για αναζήτηση παραγγελιών
  const [trackingDrafts, setTrackingDrafts] = useState({});

  // Φόρμες Διαχείρισης
  const [productForm, setProductForm] = useState({
    id: null, name: '', description: '', price: '', imageFile: null, stock: 10, category: 'Γενικά'
  });

  const [serviceForm, setServiceForm] = useState({
    id: null, category: 'Χέρια', name: '', description: '', price: '', duration_minutes: 60
  });

  const [editingApt, setEditingApt] = useState(null);

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

  const fetchHistoryByPhone = async (clientName, clientPhone) => {
    setPhoneHistory({ label: clientName, appointments: [], orders: [] });
    setLoadingPhoneHistory(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/history-by-phone/${encodeURIComponent(clientPhone)}`, { headers: getJsonHeaders() });
      if (!res.ok) return handleAuthError(res.status);
      const data = await res.json();
      setPhoneHistory({ label: clientName, ...data });
    } catch (err) { toast.error("Σφάλμα φόρτωσης ιστορικού."); }
    finally { setLoadingPhoneHistory(false); }
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
        toast.success("Το προϊόν διαγράφηκε.");
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
        toast.success("Η υπηρεσία διαγράφηκε.");
        fetchServices();
      } catch (err) { toast.error("Σφάλμα διαγραφής."); }
    });
  };

  // --- ΕΠΕΞΕΡΓΑΣΙΑ ΡΑΝΤΕΒΟΥ ---
  const handleUpdateAppointment = (e) => {
    e.preventDefault();
    if (editServices.length === 0) return toast.error("Επιλέξτε τουλάχιστον μία υπηρεσία.");
    triggerConfirm("Ενημέρωση Κράτησης", "Είστε σίγουροι για την τροποποίηση αυτού του ραντεβού;", async () => {
      try {
        const res = await fetch(`${API_URL}/api/appointments/${editingApt.id}/details`, {
          method: 'PUT',
          headers: getJsonHeaders(),
          body: JSON.stringify({
            client_name: editingApt.client_name, client_phone: editingApt.client_phone,
            client_email: editingApt.client_email, appointment_date: formatLocalDate(editingApt.appointment_date),
            appointment_time: editingApt.appointment_time.slice(0, 5), services: editServices
          })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Σφάλμα ενημέρωσης ραντεβού.");
        }
        toast.success("Το ραντεβού ενημερώθηκε!");
        setEditingApt(null);
        setEditServices([]);
        fetchAppointments();
      } catch (err) { toast.error(err.message || "Σφάλμα ενημέρωσης ραντεβού."); }
    });
  };

  // Ανοίγει το panel επεξεργασίας, ανασυνθέτοντας τις επιλεγμένες υπηρεσίες από το service_name (πιθανώς ενωμένο με κόμμα)
  const openEditAppointment = (apt) => {
    setEditingApt(apt);
    const names = apt.service_name.split(',').map(n => n.trim());
    const matched = names
      .map(name => services.find(s => s.name === name))
      .filter(Boolean)
      .map(s => ({ name: s.name, price: Number(s.price), duration_minutes: parseInt(s.duration_minutes) }));
    setEditServices(matched.length > 0 ? matched : [{ name: apt.service_name, price: Number(apt.service_price), duration_minutes: parseInt(apt.duration) || 60 }]);
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

  const handleSaveTrackingLink = async (id) => {
    const link = trackingDrafts[id] ?? '';
    try {
      const res = await fetch(`${API_URL}/api/admin/orders/${id}/tracking`, {
        method: 'PUT', headers: getJsonHeaders(), body: JSON.stringify({ tracking_link: link })
      });
      if (!res.ok) throw new Error();
      toast.success("Το link παρακολούθησης αποθηκεύτηκε!");
      fetchOrders();
    } catch { toast.error("Σφάλμα αποθήκευσης link."); }
  };

  const meta = PAGE_META[activeTab];

  return (
    <div className="admin-shell">
      <AdminSidebar
        activeTab={activeTab}
        onSelectTab={(tab) => { setActiveTab(tab); setEditingApt(null); if (tab !== 'users') setSelectedUserHistory(null); }}
        counts={{ appointments: appointments.length, orders: orders.length, users: users.length }}
        onLogout={handleLogout}
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      <main className="admin-main">
        <div className="admin-mobile-bar">
          <button onClick={() => setMobileNavOpen(true)}><IconMenu size={22} /></button>
          <h1>{meta.title}</h1>
        </div>

        <div className="admin-page-header">
          <div>
            <h2>{meta.title}</h2>
            <p>{meta.subtitle}</p>
          </div>
        </div>

        {/* ================= ΡΑΝΤΕΒΟΥ ================= */}
        {activeTab === 'appointments' && (
          <div className={`admin-grid admin-grid-2fr1fr${editingApt ? ' split' : ''}`}>
            <div className="admin-card">
              <div className="admin-card-header">
                <div>
                  <h3 className="admin-h">Πρόγραμμα &amp; κρατήσεις</h3>
                  <p className="admin-subtle">{filteredAppointments.length} εγγραφές</p>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <div className="admin-search">
                    <IconSearch size={15} />
                    <input type="text" className="admin-input" placeholder="Αναζήτηση πελάτη ή υπηρεσίας…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  </div>
                  <input type="date" className="admin-input" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
                  {dateFilter && <button className="admin-icon-btn" onClick={() => setDateFilter('')} title="Καθαρισμός φίλτρου"><IconX size={14} /></button>}
                </div>
              </div>

              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Πελάτης</th>
                      <th>Υπηρεσία</th>
                      <th>Ημερομηνία &amp; ώρα</th>
                      <th>Πληρωμή</th>
                      <th style={{ textAlign: 'right' }}>Ενέργειες</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAppointments.length === 0 ? (
                      <tr><td colSpan={5} className="admin-empty">Δεν βρέθηκαν ραντεβού.</td></tr>
                    ) : filteredAppointments.map(apt => {
                      const isBlocked = apt.client_name === BLOCKED_CLIENT_NAME;
                      return (
                        <tr key={apt.id} className={isBlocked ? 'is-flagged' : ''}>
                          <td data-label="Πελάτης">
                            {isBlocked ? (
                              <strong>{BLOCKED_LABEL}</strong>
                            ) : (
                              <>
                                <button className="admin-name-link" onClick={() => fetchHistoryByPhone(apt.client_name, apt.client_phone)}>{apt.client_name}</button>
                                <span className="admin-cell-sub">{apt.client_phone}</span>
                              </>
                            )}
                          </td>
                          <td data-label="Υπηρεσία"><span className="admin-badge admin-badge-brand">{apt.service_name}</span></td>
                          <td data-label="Ημερομηνία & ώρα">
                            {formatLocalDate(apt.appointment_date).split('-').reverse().join('/')}
                            <span className="admin-cell-sub">{apt.appointment_time.slice(0, 5)}</span>
                          </td>
                          <td data-label="Πληρωμή"><span className={`admin-badge ${apt.payment_type?.includes('Stripe') ? 'admin-badge-success' : 'admin-badge-neutral'}`}>{apt.payment_type || 'Κατάστημα'}</span></td>
                          <td data-label="Ενέργειες">
                            <div className="admin-row-actions">
                              {apt.status !== 'completed' && apt.status !== 'cancelled' && (
                                <button className="admin-icon-btn admin-icon-btn--success" onClick={() => updateAppointmentStatus(apt.id, 'completed')} title="Ολοκλήρωση"><IconCheck size={15} /></button>
                              )}
                              <button className="admin-icon-btn" onClick={() => openEditAppointment(apt)} title="Επεξεργασία"><IconEdit size={15} /></button>
                              <button className="admin-icon-btn admin-icon-btn--danger" onClick={() => handleDeleteAppointment(apt.id)} title="Διαγραφή"><IconTrash size={15} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {editingApt && (
              <div className="admin-card" style={{ height: 'fit-content' }}>
                <h4 className="admin-h" style={{ marginBottom: 18 }}>Επεξεργασία κράτησης</h4>
                <form onSubmit={handleUpdateAppointment} className="admin-form">
                  <div className="admin-field">
                    <label className="admin-label">Όνομα πελάτη</label>
                    <input type="text" className="admin-input" value={editingApt.client_name} onChange={e => setEditingApt({ ...editingApt, client_name: e.target.value })} required />
                  </div>
                  <div className="admin-field">
                    <label className="admin-label">Τηλέφωνο</label>
                    <input type="tel" className="admin-input" value={editingApt.client_phone} onChange={e => setEditingApt({ ...editingApt, client_phone: e.target.value })} />
                  </div>
                  <div className="admin-form-row">
                    <div className="admin-field">
                      <label className="admin-label">Ημερομηνία</label>
                      <input type="date" className="admin-input" value={formatLocalDate(editingApt.appointment_date)} onChange={e => setEditingApt({ ...editingApt, appointment_date: e.target.value })} required />
                    </div>
                    <div className="admin-field">
                      <label className="admin-label">Ώρα</label>
                      <input type="time" className="admin-input" value={editingApt.appointment_time.slice(0, 5)} onChange={e => setEditingApt({ ...editingApt, appointment_time: e.target.value })} required />
                    </div>
                  </div>
                  <div className="admin-field">
                    <label className="admin-label">Υπηρεσίες</label>
                    <ServicePicker services={services} selected={editServices} onChange={setEditServices} />
                  </div>
                  <div className="admin-form-actions">
                    <button type="submit" className="admin-btn admin-btn-primary admin-btn-block">Αποθήκευση</button>
                    <button type="button" className="admin-btn admin-btn-secondary admin-btn-block" onClick={() => { setEditingApt(null); setEditServices([]); }}>Ακύρωση</button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ================= ΗΜΕΡΟΛΟΓΙΟ (+ ΩΡΑΡΙΟ & ΔΙΑΘΕΣΙΜΟΤΗΤΑ, ενσωματωμένα) ================= */}
        {activeTab === 'calendar' && (
          <WeekCalendar
            apiUrl={API_URL}
            getJsonHeaders={getJsonHeaders}
            getAuthHeaders={getAuthHeaders}
            appointments={appointments}
            services={services}
            users={users}
            formatLocalDate={formatLocalDate}
            onAppointmentsChanged={fetchAppointments}
            onViewProfile={fetchHistoryByPhone}
          />
        )}

        {/* ================= ΠΑΡΑΓΓΕΛΙΕΣ ================= */}
        {activeTab === 'orders' && (
          <div className="admin-card">
            <div className="admin-card-header">
              <h3 className="admin-h">Διαχείριση παραγγελιών</h3>
              <div className="admin-search">
                <IconSearch size={15} />
                <input type="text" className="admin-input" placeholder="Αναζήτηση με κωδικό ή όνομα…" value={orderSearchTerm} onChange={e => setOrderSearchTerm(e.target.value)} style={{ width: 280 }} />
              </div>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Κωδικός / Πελάτης</th>
                    <th>Προϊόντα</th>
                    <th>Locker BoxNow</th>
                    <th style={{ textAlign: 'right' }}>Σύνολο</th>
                    <th style={{ textAlign: 'center' }}>Κατάσταση</th>
                    <th>Tracking BoxNow</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr><td colSpan={6} className="admin-empty">Δεν βρέθηκαν παραγγελίες.</td></tr>
                  ) : filteredOrders.map(order => {
                    const isCancelled = order.status === 'cancelled';
                    const isShipped = order.status === 'shipped';
                    return (
                      <tr key={order.id} className={isCancelled ? 'is-flagged' : ''}>
                        <td data-label="Κωδικός / Πελάτης">
                          <span className="admin-badge admin-badge-neutral">#{order.id}</span>
                          <strong style={{ display: 'block', marginTop: 4 }}>{order.client_name}</strong>
                          <span className="admin-cell-sub">{order.client_phone}</span>
                        </td>
                        <td data-label="Προϊόντα">
                          {order.products?.map((p, idx) => (
                            <div key={idx} style={{ fontSize: '0.85rem', marginBottom: 2 }}>
                              <strong>{p.qty}×</strong> {p.name}
                            </div>
                          ))}
                        </td>
                        <td data-label="Locker BoxNow" style={{ fontSize: '0.85rem', color: 'var(--info)' }}>{order.boxnow_locker}</td>
                        <td data-label="Σύνολο" style={{ textAlign: 'right' }}><strong style={{ color: 'var(--success)' }}>{Number(order.total_amount).toFixed(2)}€</strong></td>
                        <td data-label="Κατάσταση" style={{ textAlign: 'center' }}>
                          {isCancelled ? (
                            <span className="admin-badge admin-badge-danger">Ακυρώθηκε</span>
                          ) : (
                            <select
                              className="admin-select-status"
                              value={order.status}
                              onChange={(e) => handleOrderStatusChange(order.id, e.target.value)}
                              style={{
                                background: order.status === 'completed' ? 'var(--success-bg)' : order.status === 'shipped' ? 'var(--info-bg)' : 'var(--warning-bg)',
                                color: order.status === 'completed' ? 'var(--success)' : order.status === 'shipped' ? 'var(--info)' : 'var(--warning)'
                              }}
                            >
                              <option value="pending">Εκκρεμεί</option>
                              <option value="shipped">Στάλθηκε</option>
                              <option value="completed">Παραλήφθηκε</option>
                              <option value="cancelled">Ακυρώθηκε</option>
                            </select>
                          )}
                        </td>
                        <td data-label="Tracking BoxNow">
                          {isShipped ? (
                            <div style={{ display: 'flex', gap: 6, minWidth: 200 }}>
                              <input
                                type="text"
                                className="admin-input"
                                placeholder="Link παρακολούθησης…"
                                value={trackingDrafts[order.id] ?? order.tracking_link ?? ''}
                                onChange={e => setTrackingDrafts({ ...trackingDrafts, [order.id]: e.target.value })}
                              />
                              <button className="admin-icon-btn admin-icon-btn--success" title="Αποθήκευση" onClick={() => handleSaveTrackingLink(order.id)}>
                                <IconCheck size={14} />
                              </button>
                            </div>
                          ) : order.tracking_link ? (
                            <a href={order.tracking_link} target="_blank" rel="noopener noreferrer" className="admin-cell-sub" style={{ color: 'var(--info)' }}>{order.tracking_link}</a>
                          ) : (
                            <span className="admin-cell-sub">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= ΠΡΟΪΟΝΤΑ ================= */}
        {activeTab === 'products' && (
          <div className="admin-grid admin-grid-form-list split">
            <div className="admin-card" style={{ height: 'fit-content' }}>
              <h3 className="admin-h" style={{ marginBottom: 18 }}>{productForm.id ? 'Επεξεργασία προϊόντος' : 'Νέο προϊόν'}</h3>
              <form onSubmit={handleSaveProduct} className="admin-form">
                <input type="text" className="admin-input" placeholder="Όνομα προϊόντος" required value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} />
                <textarea className="admin-textarea" placeholder="Περιγραφή προϊόντος…" value={productForm.description} onChange={e => setProductForm({ ...productForm, description: e.target.value })} />
                <div className="admin-form-row">
                  <div className="admin-field">
                    <label className="admin-label">Τιμή (€)</label>
                    <input type="number" step="0.01" required className="admin-input" value={productForm.price} onChange={e => setProductForm({ ...productForm, price: e.target.value })} />
                  </div>
                  <div className="admin-field">
                    <label className="admin-label">Απόθεμα</label>
                    <input type="number" required className="admin-input" value={productForm.stock} onChange={e => setProductForm({ ...productForm, stock: e.target.value })} />
                  </div>
                </div>

                <div className="admin-field">
                  <label className="admin-label">Κατηγορία</label>
                  <input
                    type="text"
                    list="product-categories-list"
                    className="admin-input"
                    placeholder="π.χ. Βερνίκια, Εργαλεία…"
                    value={productForm.category}
                    onChange={e => setProductForm({ ...productForm, category: e.target.value })}
                  />
                  <datalist id="product-categories-list">
                    {[...new Set(products.map(p => p.category).filter(Boolean))].map(cat => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>

                <div className="admin-field">
                  <label className="admin-label">Φωτογραφία προϊόντος</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="admin-input"
                    onChange={e => setProductForm({ ...productForm, imageFile: e.target.files[0] })}
                  />
                  {!productForm.imageFile && !productForm.id && <span className="admin-cell-sub" style={{ color: 'var(--danger)' }}>Απαιτείται επιλογή αρχείου.</span>}
                </div>

                <div className="admin-form-actions">
                  <button type="submit" className="admin-btn admin-btn-primary admin-btn-block">{productForm.id ? 'Αποθήκευση' : 'Προσθήκη'}</button>
                  {productForm.id && <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setProductForm({ id: null, name: '', description: '', price: '', imageFile: null, stock: 10, category: 'Γενικά' })}>Ακύρωση</button>}
                </div>
              </form>
            </div>

            <div className="admin-card">
              <h3 className="admin-h" style={{ marginBottom: 18 }}>Αποθήκη προϊόντων</h3>
              <div className="admin-stack" style={{ gap: 12 }}>
                {products.map(p => (
                  <div key={p.id} className="admin-list-item-row">
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                      <img src={p.image_url} alt={p.name} className="admin-thumb" />
                      <div>
                        <strong style={{ fontSize: '0.95rem', display: 'block' }}>{p.name}</strong>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                          <span className="admin-badge admin-badge-brand">{p.category || 'Γενικά'}</span>
                          <strong style={{ color: 'var(--success)' }}>{Number(p.price).toFixed(2)}€</strong>
                          <span className={`admin-badge ${p.stock <= 2 ? 'admin-badge-danger' : 'admin-badge-neutral'}`}>
                            {p.stock <= 2 && <IconAlert size={11} />} Απόθεμα: {p.stock}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="admin-row-actions">
                      <button className="admin-icon-btn" onClick={() => setProductForm(p)} title="Επεξεργασία"><IconEdit size={15} /></button>
                      <button className="admin-icon-btn admin-icon-btn--danger" onClick={() => handleDeleteProduct(p.id)} title="Διαγραφή"><IconTrash size={15} /></button>
                    </div>
                  </div>
                ))}
                {products.length === 0 && <p className="admin-empty">Δεν υπάρχουν προϊόντα.</p>}
              </div>
            </div>
          </div>
        )}

        {/* ================= ΥΠΗΡΕΣΙΕΣ ================= */}
        {activeTab === 'services' && (
          <div className="admin-grid admin-grid-form-list split">
            <div className="admin-card" style={{ height: 'fit-content' }}>
              <h3 className="admin-h" style={{ marginBottom: 18 }}>{serviceForm.id ? 'Επεξεργασία υπηρεσίας' : 'Νέα υπηρεσία'}</h3>
              <form onSubmit={handleSaveService} className="admin-form">
                <div className="admin-field">
                  <label className="admin-label">Κατηγορία μενού</label>
                  <select className="admin-select" value={serviceForm.category} onChange={e => setServiceForm({ ...serviceForm, category: e.target.value })}>
                    <option value="Χέρια">Χέρια</option>
                    <option value="Πόδια">Πόδια</option>
                    <option value="Πρόσωπο">Πρόσωπο</option>
                  </select>
                </div>

                <input type="text" className="admin-input" required placeholder="Όνομα υπηρεσίας (π.χ. Ημιμόνιμο με Spa)" value={serviceForm.name} onChange={e => setServiceForm({ ...serviceForm, name: e.target.value })} />
                <textarea className="admin-textarea" placeholder="Περιγραφή υπηρεσίας…" value={serviceForm.description || ''} onChange={e => setServiceForm({ ...serviceForm, description: e.target.value })} />

                <div className="admin-form-row">
                  <div className="admin-field">
                    <label className="admin-label">Τιμή (€)</label>
                    <input type="number" step="0.01" required className="admin-input" value={serviceForm.price} onChange={e => setServiceForm({ ...serviceForm, price: e.target.value })} />
                  </div>
                  <div className="admin-field">
                    <label className="admin-label">Διάρκεια</label>
                    <select className="admin-select" value={serviceForm.duration_minutes} onChange={e => setServiceForm({ ...serviceForm, duration_minutes: e.target.value })}>
                      <option value="15">15 λεπτά</option>
                      <option value="30">30 λεπτά</option>
                      <option value="45">45 λεπτά</option>
                      <option value="60">1 ώρα</option>
                      <option value="90">1.5 ώρα</option>
                      <option value="120">2 ώρες</option>
                      <option value="150">2.5 ώρες</option>
                    </select>
                  </div>
                </div>

                <div className="admin-form-actions">
                  <button type="submit" className="admin-btn admin-btn-primary admin-btn-block">{serviceForm.id ? 'Αποθήκευση' : 'Δημιουργία'}</button>
                  {serviceForm.id && <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setServiceForm({ id: null, category: 'Χέρια', name: '', description: '', price: '', duration_minutes: 60 })}>Ακύρωση</button>}
                </div>
              </form>
            </div>

            <div className="admin-card">
              <h3 className="admin-h" style={{ marginBottom: 18 }}>Κατάλογος υπηρεσιών</h3>
              <div className="admin-stack">
                {['Χέρια', 'Πόδια', 'Πρόσωπο'].map(category => {
                  const categoryServices = services.filter(s => s.category === category);
                  if (categoryServices.length === 0) return null;
                  return (
                    <div key={category}>
                      <h4 style={{ color: 'var(--accent)', borderBottom: '1px solid var(--line)', paddingBottom: 8, marginBottom: 14, fontSize: '0.95rem', fontWeight: 700 }}>{category}</h4>
                      <div className="admin-stack" style={{ gap: 12 }}>
                        {categoryServices.map(s => (
                          <div key={s.id} className="admin-list-item-row" style={{ alignItems: 'flex-start' }}>
                            <div>
                              <strong style={{ fontSize: '0.95rem', display: 'block' }}>{s.name}</strong>
                              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
                                <strong style={{ color: 'var(--success)' }}>{Number(s.price).toFixed(2)}€</strong>
                                <span className="admin-badge admin-badge-neutral"><IconClock size={11} /> {s.duration_minutes}λ</span>
                              </div>
                              {s.description && <p className="admin-cell-sub" style={{ marginTop: 6, fontStyle: 'italic' }}>{s.description}</p>}
                            </div>
                            <div className="admin-row-actions">
                              <button className="admin-icon-btn" onClick={() => setServiceForm(s)} title="Επεξεργασία"><IconEdit size={15} /></button>
                              <button className="admin-icon-btn admin-icon-btn--danger" onClick={() => handleDeleteService(s.id)} title="Διαγραφή"><IconTrash size={15} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {services.filter(s => !['Χέρια', 'Πόδια', 'Πρόσωπο'].includes(s.category)).length > 0 && (
                  <div>
                    <h4 style={{ color: 'var(--ink-muted)', borderBottom: '1px solid var(--line)', paddingBottom: 8, marginBottom: 14, fontSize: '0.95rem', fontWeight: 700 }}>Άλλες υπηρεσίες</h4>
                    <div className="admin-stack" style={{ gap: 12 }}>
                      {services.filter(s => !['Χέρια', 'Πόδια', 'Πρόσωπο'].includes(s.category)).map(s => (
                        <div key={s.id} className="admin-list-item-row" style={{ alignItems: 'flex-start' }}>
                          <div>
                            <span className="admin-badge admin-badge-neutral">{s.category}</span>
                            <strong style={{ fontSize: '0.95rem', display: 'block', marginTop: 6 }}>{s.name}</strong>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
                              <strong style={{ color: 'var(--success)' }}>{Number(s.price).toFixed(2)}€</strong>
                              <span className="admin-badge admin-badge-neutral"><IconClock size={11} /> {s.duration_minutes}λ</span>
                            </div>
                          </div>
                          <div className="admin-row-actions">
                            <button className="admin-icon-btn" onClick={() => setServiceForm(s)} title="Επεξεργασία"><IconEdit size={15} /></button>
                            <button className="admin-icon-btn admin-icon-btn--danger" onClick={() => handleDeleteService(s.id)} title="Διαγραφή"><IconTrash size={15} /></button>
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

        {/* ================= ΣΤΑΤΙΣΤΙΚΑ ================= */}
        {activeTab === 'stats' && (
          <div className="admin-stack">
            <div className="admin-card admin-flex-between">
              <div>
                <h3 className="admin-h">Φίλτρα αναλυτικής &amp; τζίρου</h3>
                <p className="admin-subtle">Επίλεξε την περίοδο αναφοράς για τον υπολογισμό των δεικτών.</p>
              </div>
              <div className="admin-pill-group">
                {['1m', '3m', '6m', '1y'].map(range => (
                  <button key={range} className={`admin-pill${statsRange === range ? ' active' : ''}`} onClick={() => setStatsRange(range)}>
                    {range === '1m' ? '1 μήνας' : range === '3m' ? '3μηνο' : range === '6m' ? '6μηνο' : '1 έτος'}
                  </button>
                ))}
                <button className={`admin-pill${statsRange === 'custom' ? ' active' : ''}`} onClick={() => setStatsRange('custom')}>Προσαρμοσμένο</button>
                {statsRange === 'custom' && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="date" className="admin-input" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} />
                    <span className="admin-subtle">έως</span>
                    <input type="date" className="admin-input" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} />
                  </div>
                )}
              </div>
            </div>

            {loadingStats ? <p className="admin-empty">Υπολογισμός δεδομένων…</p> : (
              <>
                <div className="admin-grid admin-grid-kpi">
                  <div className="admin-kpi admin-kpi--success">
                    <div className="admin-kpi-label">Συνολικά έσοδα</div>
                    <div className="admin-kpi-value">{(Number(salesStats?.summary?.total_revenue || 0) + Number(appointmentStats?.summary?.realized_revenue || 0)).toFixed(2)}€</div>
                    <p className="admin-kpi-note">E-shop: {Number(salesStats?.summary?.total_revenue || 0).toFixed(2)}€ · Ραντεβού: {Number(appointmentStats?.summary?.realized_revenue || 0).toFixed(2)}€</p>
                  </div>
                  <div className="admin-kpi">
                    <div className="admin-kpi-label">Pipeline (μελλοντικά ραντεβού)</div>
                    <div className="admin-kpi-value">{Number(appointmentStats?.summary?.future_revenue || 0).toFixed(2)}€</div>
                    <p className="admin-kpi-note">Αξία κλεισμένων ραντεβού για το μέλλον.</p>
                  </div>
                  <div className="admin-kpi admin-kpi--info">
                    <div className="admin-kpi-label">Παραγγελίες e-shop</div>
                    <div className="admin-kpi-value">{salesStats?.summary?.total_orders || 0}</div>
                    <p className="admin-kpi-note">Μέση αξία: {Number(salesStats?.summary?.average_order_value || 0).toFixed(2)}€</p>
                  </div>
                  <div className="admin-kpi admin-kpi--brand">
                    <div className="admin-kpi-label">Ολοκληρωμένα ραντεβού</div>
                    <div className="admin-kpi-value">{appointmentStats?.summary?.total_appointments || 0}</div>
                    <p className="admin-kpi-note">Στην επιλεγμένη περίοδο αναφοράς.</p>
                  </div>
                </div>

                <div className="admin-grid admin-grid-2col">
                  <div className="admin-card">
                    <h4 className="admin-h" style={{ marginBottom: 14 }}>Κορυφαία προϊόντα &amp; υπηρεσίες</h4>
                    <span className="admin-eyebrow">Προϊόντα e-shop</span>
                    {salesStats?.bestSellers?.length > 0 ? salesStats.bestSellers.map((p, idx) => (
                      <div key={idx} className="admin-list-row">
                        <span><span className="admin-list-rank">{idx + 1}.</span><strong>{p.product_name}</strong></span>
                        <span className="admin-subtle">{p.total_quantity_sold} τεμ. · <strong style={{ color: 'var(--success)' }}>{Number(p.total_sales_value).toFixed(2)}€</strong></span>
                      </div>
                    )) : <p className="admin-empty">Καμία πώληση σε αυτή την περίοδο.</p>}

                    <span className="admin-eyebrow" style={{ marginTop: 14, display: 'block' }}>Υπηρεσίες καταστήματος</span>
                    {appointmentStats?.topServices?.length > 0 ? appointmentStats.topServices.map((s, idx) => (
                      <div key={idx} className="admin-list-row">
                        <span><span className="admin-list-rank">{idx + 1}.</span><strong>{s.service_name}</strong></span>
                        <span className="admin-subtle">{s.times_booked} κρατήσεις · <strong style={{ color: 'var(--success)' }}>{Number(s.total_generated_revenue).toFixed(2)}€</strong></span>
                      </div>
                    )) : <p className="admin-empty">Κανένα ραντεβού σε αυτή την περίοδο.</p>}
                  </div>

                  <div className="admin-card">
                    <h4 className="admin-h" style={{ marginBottom: 14 }}>Κορυφαίοι πελάτες</h4>
                    <span className="admin-eyebrow">Κατά επισκέψεις (ραντεβού)</span>
                    {appointmentStats?.frequentClients?.length > 0 ? appointmentStats.frequentClients.map((c, idx) => (
                      <div key={idx} className="admin-list-row">
                        <div>
                          <strong>{c.client_name}</strong>
                          <span className="admin-cell-sub">{c.client_phone}</span>
                        </div>
                        <span style={{ textAlign: 'right' }}>{c.visit_count} επισκέψεις<br /><strong style={{ color: 'var(--success)' }}>{Number(c.total_value).toFixed(2)}€</strong></span>
                      </div>
                    )) : <p className="admin-empty">Δεν υπάρχουν δεδομένα πελατών.</p>}

                    <span className="admin-eyebrow" style={{ marginTop: 14, display: 'block' }}>Κατά αγορές (e-shop)</span>
                    {salesStats?.topCustomers?.length > 0 ? salesStats.topCustomers.map((c, idx) => (
                      <div key={idx} className="admin-list-row">
                        <div>
                          <strong>{c.client_name}</strong>
                          <span className="admin-cell-sub">{c.client_email}</span>
                        </div>
                        <span style={{ textAlign: 'right' }}>{c.order_count} παραγγελίες<br /><strong style={{ color: 'var(--success)' }}>{Number(c.total_spent).toFixed(2)}€</strong></span>
                      </div>
                    )) : <p className="admin-empty">Δεν υπάρχουν δεδομένα αγορών.</p>}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ================= ΠΕΛΑΤΕΣ ================= */}
        {activeTab === 'users' && (
          <div className={`admin-grid admin-grid-2fr1fr${selectedUserHistory ? ' split' : ''}`}>
            <div className="admin-card">
              <div className="admin-card-header">
                <h3 className="admin-h">Εγγεγραμμένοι χρήστες ({users.length})</h3>
                <div className="admin-search">
                  <IconSearch size={15} />
                  <input type="text" className="admin-input" placeholder="Αναζήτηση με όνομα, email ή τηλέφωνο…" value={userSearchTerm} onChange={e => setUserSearchTerm(e.target.value)} style={{ width: 280 }} />
                </div>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Στοιχεία</th>
                      <th>Εγγραφή</th>
                      <th style={{ textAlign: 'center' }}>Ραντεβού</th>
                      <th style={{ textAlign: 'center' }}>Παραγγελίες</th>
                      <th style={{ textAlign: 'right' }}>Ενέργειες</th>
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
                        <tr key={u.id} className={selectedUserHistory?.user?.id === u.id ? 'is-flagged' : ''}>
                          <td data-label="Στοιχεία">
                            <strong>{u.name}</strong>
                            <span className="admin-cell-sub">{u.email} · {u.phone}</span>
                          </td>
                          <td data-label="Εγγραφή">{formatLocalDate(u.created_at).split('-').reverse().join('/')}</td>
                          <td data-label="Ραντεβού" style={{ textAlign: 'center' }}>{u.appointment_count}</td>
                          <td data-label="Παραγγελίες" style={{ textAlign: 'center' }}>{u.order_count}</td>
                          <td data-label="Ενέργειες" style={{ textAlign: 'right' }}>
                            <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => fetchUserHistory(u)}>Ιστορικό</button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedUserHistory && (
              <ClientHistoryPanel
                label={selectedUserHistory.user.name}
                appointments={selectedUserHistory.appointments}
                orders={selectedUserHistory.orders}
                loading={loadingUserHistory}
                onClose={() => setSelectedUserHistory(null)}
                formatLocalDate={formatLocalDate}
              />
            )}
          </div>
        )}

        <ToastContainer position="top-right" autoClose={3000} style={{ zIndex: 999999 }} />

        {confirmDialog.isOpen && (
          <div className="pro-modal-overlay">
            <div className="pro-modal" style={{ textAlign: 'center' }}>
              <h3>{confirmDialog.title}</h3>
              <p style={{ color: 'var(--ink-soft)', marginBottom: 25, lineHeight: 1.5 }}>{confirmDialog.message}</p>
              <div className="pro-modal-actions" style={{ justifyContent: 'center' }}>
                <button className="pro-btn primary" onClick={confirmDialog.onConfirm}>Ναι, επιβεβαίωση</button>
                <button className="pro-btn secondary" onClick={() => setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null })}>Άκυρο</button>
              </div>
            </div>
          </div>
        )}

        {phoneHistory && (
          <div className="admin-panel-overlay" onClick={() => setPhoneHistory(null)}>
            <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480 }}>
              <ClientHistoryPanel
                label={phoneHistory.label}
                appointments={phoneHistory.appointments}
                orders={phoneHistory.orders}
                loading={loadingPhoneHistory}
                onClose={() => setPhoneHistory(null)}
                formatLocalDate={formatLocalDate}
              />
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

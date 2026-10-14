import React, { useState } from 'react';
import { toast } from 'react-toastify';
import ServicePicker from './ServicePicker';
import TimeInput24 from './TimeInput24';
import { IconX, IconHistory } from './icons';
import { findConflict, describeConflict } from './appointmentConflicts';

const BLOCKED_CLIENT_NAME = "🔐 ΚΛΕΙΣΤΟ / ΡΕΠΟ";

// Αναδυόμενο πάνελ επεξεργασίας ραντεβού — ανοίγει πάνω από τη σελίδα όπου πατήθηκε (λίστα ή ημερολόγιο)
export default function AppointmentEditPanel({ apt, services, appointments, apiUrl, getJsonHeaders, formatLocalDate, triggerConfirm, onClose, onSaved, onViewHistory }) {
  const [form, setForm] = useState({
    client_name: apt.client_name,
    client_phone: apt.client_phone || '',
    appointment_date: formatLocalDate(apt.appointment_date),
    appointment_time: apt.appointment_time.slice(0, 5)
  });
  const [selectedServices, setSelectedServices] = useState(() => {
    const matched = apt.service_name.split(',').map(n => n.trim())
      .map(name => services.find(s => s.name === name))
      .filter(Boolean)
      .map(s => ({ name: s.name, price: Number(s.price), duration_minutes: parseInt(s.duration_minutes) }));
    return matched.length > 0 ? matched : [{ name: apt.service_name, price: Number(apt.service_price), duration_minutes: parseInt(apt.duration) || 60 }];
  });
  const [saving, setSaving] = useState(false);

  const duration = selectedServices.reduce((sum, s) => sum + parseInt(s.duration_minutes || 0), 0);
  const conflict = findConflict({
    appointments, services, formatLocalDate,
    date: form.appointment_date, time: form.appointment_time, duration, excludeId: apt.id
  });

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${apiUrl}/api/appointments/${apt.id}/details`, {
        method: 'PUT',
        headers: getJsonHeaders(),
        body: JSON.stringify({
          client_name: form.client_name, client_phone: form.client_phone, client_email: apt.client_email,
          appointment_date: form.appointment_date, appointment_time: form.appointment_time, services: selectedServices
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Σφάλμα ενημέρωσης ραντεβού.");
      }
      toast.success("Το ραντεβού ενημερώθηκε!");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.message || "Σφάλμα ενημέρωσης ραντεβού.");
      setSaving(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (saving) return;
    if (selectedServices.length === 0) return toast.error("Επιλέξτε τουλάχιστον μία υπηρεσία.");
    if (conflict) return toast.error(describeConflict(conflict, services, BLOCKED_CLIENT_NAME));
    triggerConfirm("Ενημέρωση Κράτησης", "Είστε σίγουροι για την τροποποίηση αυτού του ραντεβού;", save);
  };

  const isBlocked = apt.client_name === BLOCKED_CLIENT_NAME;

  return (
    <div className="admin-slideover-overlay" onClick={() => !saving && onClose()}>
      <div className="admin-slideover" onClick={e => e.stopPropagation()}>
        <div className="admin-flex-between" style={{ marginBottom: 18 }}>
          <h4 className="admin-h">Επεξεργασία κράτησης</h4>
          <button className="admin-icon-btn" onClick={onClose} disabled={saving}><IconX size={15} /></button>
        </div>
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="admin-field">
            <label className="admin-label">Όνομα πελάτη</label>
            <input type="text" className="admin-input" value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} required />
          </div>
          <div className="admin-field">
            <label className="admin-label">Τηλέφωνο</label>
            <input type="tel" className="admin-input" value={form.client_phone} onChange={e => setForm({ ...form, client_phone: e.target.value })} />
          </div>
          <div className="admin-form-row">
            <div className="admin-field">
              <label className="admin-label">Ημερομηνία</label>
              <input type="date" className="admin-input" value={form.appointment_date} onChange={e => setForm({ ...form, appointment_date: e.target.value })} required />
            </div>
            <div className="admin-field">
              <label className="admin-label">Ώρα</label>
              <TimeInput24 value={form.appointment_time} onChange={v => setForm({ ...form, appointment_time: v })} />
            </div>
          </div>
          <div className="admin-field">
            <label className="admin-label">Υπηρεσίες</label>
            <ServicePicker services={services} selected={selectedServices} onChange={setSelectedServices} />
          </div>

          {conflict && (
            <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
              {describeConflict(conflict, services, BLOCKED_CLIENT_NAME)} Επιλέξτε άλλη ώρα.
            </div>
          )}

          <div className="admin-form-actions">
            <button type="submit" className="admin-btn admin-btn-primary admin-btn-block" disabled={saving || !!conflict}>
              {saving ? 'Αποθήκευση…' : 'Αποθήκευση'}
            </button>
            <button type="button" className="admin-btn admin-btn-secondary admin-btn-block" onClick={onClose} disabled={saving}>Ακύρωση</button>
          </div>
          {!isBlocked && onViewHistory && (
            <button type="button" className="admin-btn admin-btn-secondary admin-btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => onViewHistory(apt.client_name, apt.client_phone)}>
              <IconHistory size={13} /> Ιστορικό πελάτισσας
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

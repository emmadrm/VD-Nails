import React from 'react';
import { IconX, IconHistory, IconReceipt } from './icons';

export default function ClientHistoryPanel({ label, appointments, orders, loading, onClose, formatLocalDate }) {
  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h4 className="admin-h">Ιστορικό — {label}</h4>
        <button className="admin-icon-btn" onClick={onClose}><IconX size={15} /></button>
      </div>

      {loading ? (
        <p className="admin-empty">Φόρτωση ιστορικού…</p>
      ) : (
        <>
          <div className="admin-flex-between" style={{ marginBottom: 4 }}>
            <span className="admin-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <IconHistory size={13} /> Ραντεβού ({appointments?.length || 0})
            </span>
          </div>
          {appointments?.length > 0 ? appointments.map(a => (
            <div key={a.id} className="admin-list-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
              <div className="admin-flex-between" style={{ width: '100%' }}>
                <strong style={{ fontSize: '0.88rem' }}>{a.service_name}</strong>
                <span className={`admin-badge ${a.status === 'completed' ? 'admin-badge-success' : a.status === 'cancelled' ? 'admin-badge-danger' : 'admin-badge-neutral'}`}>{a.status}</span>
              </div>
              <span className="admin-cell-sub">{formatLocalDate(a.appointment_date).split('-').reverse().join('/')} · {a.appointment_time.slice(0, 5)}</span>
            </div>
          )) : <p className="admin-empty">Δεν υπάρχουν ραντεβού.</p>}

          <hr className="admin-divider" />

          <span className="admin-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <IconReceipt size={13} /> Παραγγελίες ({orders?.length || 0})
          </span>
          {orders?.length > 0 ? orders.map(o => (
            <div key={o.id} className="admin-list-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
              <div className="admin-flex-between" style={{ width: '100%' }}>
                <strong style={{ fontSize: '0.88rem' }}>Παραγγελία #{o.id}</strong>
                <strong style={{ color: 'var(--success)' }}>{Number(o.total_amount).toFixed(2)}€</strong>
              </div>
              <span className="admin-cell-sub">{new Date(o.created_at).toLocaleDateString('el-GR')} · {o.status}</span>
            </div>
          )) : <p className="admin-empty">Δεν υπάρχουν παραγγελίες.</p>}
        </>
      )}
    </div>
  );
}

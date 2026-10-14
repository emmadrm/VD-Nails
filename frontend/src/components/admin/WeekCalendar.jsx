import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import DatePicker from 'react-datepicker';
import ServicePicker from './ServicePicker';
import TimeInput24 from './TimeInput24';
import { IconChevronLeft, IconChevronRight, IconCalendar, IconClock, IconX } from './icons';
import { getDefaultHours } from '../../businessHours';
import { findConflict, describeConflict } from './appointmentConflicts';

const PX_PER_MIN = 1.7;
const BLOCKED_CLIENT_NAME = "🔐 ΚΛΕΙΣΤΟ / ΡΕΠΟ";
const BLOCKED_LABEL = "Κλειστό / Ρεπό";
const WEEKDAY_LABELS = ['Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ', 'Κυρ'];
const MONTHS_GR = ['Ιαν', 'Φεβ', 'Μάρ', 'Απρ', 'Μάι', 'Ιούν', 'Ιούλ', 'Αύγ', 'Σεπ', 'Οκτ', 'Νοέ', 'Δεκ'];

const timeToMinutes = (t) => { const [h, m] = t.slice(0, 5).split(':').map(Number); return h * 60 + m; };
const minutesToTime = (mins) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

const getWeekStart = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() + ((day === 0 ? -6 : 1) - day));
  return d;
};
const addDays = (date, n) => { const d = new Date(date); d.setDate(d.getDate() + n); return d; };

const formatRangeLabel = (dates) => {
  const first = dates[0], last = dates[6];
  if (first.getMonth() === last.getMonth()) return `${first.getDate()}–${last.getDate()} ${MONTHS_GR[first.getMonth()]} ${first.getFullYear()}`;
  return `${first.getDate()} ${MONTHS_GR[first.getMonth()]} – ${last.getDate()} ${MONTHS_GR[last.getMonth()]} ${last.getFullYear()}`;
};

const layoutDay = (dayApts, getDuration) => {
  const events = [...dayApts]
    .map(apt => { const start = timeToMinutes(apt.appointment_time); return { apt, start, end: start + getDuration(apt) }; })
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const clusters = [];
  let current = [], currentEnd = -Infinity;
  events.forEach(ev => {
    if (current.length === 0 || ev.start < currentEnd) { current.push(ev); currentEnd = Math.max(currentEnd, ev.end); }
    else { clusters.push(current); current = [ev]; currentEnd = ev.end; }
  });
  if (current.length) clusters.push(current);

  const result = [];
  clusters.forEach(cluster => {
    const columnEnds = [];
    cluster.forEach(ev => {
      let col = columnEnds.findIndex(endTime => ev.start >= endTime);
      if (col === -1) { col = columnEnds.length; columnEnds.push(ev.end); } else { columnEnds[col] = ev.end; }
      ev.col = col;
    });
    const totalCols = columnEnds.length;
    cluster.forEach(ev => result.push({ ...ev, totalCols }));
  });
  return result;
};

export default function WeekCalendar({ apiUrl, getJsonHeaders, getAuthHeaders, appointments, services, users, formatLocalDate, onAppointmentsChanged, onUsersChanged, onEditAppointment }) {
  const [weekStart, setWeekStart] = useState(getWeekStart(new Date()));
  const [hoursMap, setHoursMap] = useState({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [hoursPopover, setHoursPopover] = useState(null);
  const [entryPopover, setEntryPopover] = useState(null);
  const [submittingEntry, setSubmittingEntry] = useState(false);
  const submittingRef = useRef(false); // μπλοκάρει τα γρήγορα διπλά/τριπλά κλικ

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const fetchWeekHours = () => {
    const start = formatLocalDate(weekDates[0]);
    const end = formatLocalDate(weekDates[6]);
    fetch(`${apiUrl}/api/admin/business-hours?startDate=${start}&endDate=${end}`, { headers: getAuthHeaders() })
      .then(res => res.ok ? res.json() : [])
      .then(rows => {
        const map = {};
        rows.forEach(r => { map[r.date] = { open_time: r.open_time.slice(0, 5), close_time: r.close_time.slice(0, 5), is_override: true }; });
        setHoursMap(map);
      })
      .catch(() => setHoursMap({}));
  };

  useEffect(() => { fetchWeekHours(); }, [weekStart]);

  const effectiveHours = (dateStr) => {
    if (hoursMap[dateStr]) return hoursMap[dateStr];
    const [y, m, d] = dateStr.split('-').map(Number);
    const def = getDefaultHours(new Date(y, m - 1, d));
    return def ? { ...def, is_override: false, is_closed: false } : { open_time: null, close_time: null, is_override: false, is_closed: true };
  };
  const getAptDuration = (apt) => {
    if (apt.duration) return parseInt(apt.duration);
    const svc = services.find(s => s.name === apt.service_name);
    return svc ? svc.duration_minutes : 60;
  };

  const openDays = weekDates.map(d => effectiveHours(formatLocalDate(d))).filter(h => !h.is_closed);
  const allOpens = openDays.map(h => timeToMinutes(h.open_time));
  // Ραντεβού που τελειώνουν μετά το κλείσιμο μεγαλώνουν το πλέγμα, ώστε να φαίνονται ολόκληρα
  const weekDateStrs = new Set(weekDates.map(d => formatLocalDate(d)));
  const weekAptEnds = appointments
    .filter(a => a.status !== 'cancelled' && weekDateStrs.has(formatLocalDate(a.appointment_date)))
    .map(a => timeToMinutes(a.appointment_time) + getAptDuration(a));
  const allCloses = [...openDays.map(h => timeToMinutes(h.close_time)), ...weekAptEnds];
  const rangeStartHour = allOpens.length ? Math.floor(Math.min(...allOpens) / 60) : 9;
  const rangeEndHour = allCloses.length ? Math.min(24, Math.ceil(Math.max(...allCloses) / 60)) : 21;
  const rangeStartMin = rangeStartHour * 60;
  const gridHeight = (rangeEndHour - rangeStartHour) * 60 * PX_PER_MIN;
  const hourMarks = [];
  for (let h = rangeStartHour; h < rangeEndHour; h++) hourMarks.push(h);

  const todayStr = formatLocalDate(new Date());

  const handleSlotClick = (dateStr, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rawMinutes = rangeStartMin + (e.clientY - rect.top) / PX_PER_MIN;
    const snapped = Math.round(rawMinutes / 15) * 15;
    setEntryPopover({
      dateStr, time: minutesToTime(snapped), mode: 'book',
      clientSearch: '', selectedClient: null, newClient: null, creatingClient: false, selectedServices: [],
      blockReason: 'Ρεπό / Προσωπικός Χρόνος', blockDuration: 60
    });
  };

  const saveDayHours = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/admin/business-hours`, {
        method: 'POST', headers: getJsonHeaders(),
        body: JSON.stringify({ date: hoursPopover.dateStr, open_time: hoursPopover.open_time, close_time: hoursPopover.close_time })
      });
      if (!res.ok) { const errData = await res.json().catch(() => ({})); throw new Error(errData.error); }
      toast.success("Το ωράριο ενημερώθηκε.");
      setHoursPopover(null);
      fetchWeekHours();
    } catch (err) { toast.error(err.message || "Σφάλμα αποθήκευσης ωραρίου."); }
  };

  const resetDayHours = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/admin/business-hours/${hoursPopover.dateStr}`, { method: 'DELETE', headers: getJsonHeaders() });
      if (!res.ok) throw new Error();
      toast.success("Επαναφορά στο προεπιλεγμένο ωράριο.");
      setHoursPopover(null);
      fetchWeekHours();
    } catch { toast.error("Σφάλμα επαναφοράς."); }
  };

  const entryEstDuration = () => {
    if (!entryPopover) return 0;
    return entryPopover.mode === 'book'
      ? entryPopover.selectedServices.reduce((s, x) => s + parseInt(x.duration_minutes || 0), 0)
      : parseInt(entryPopover.blockDuration || 0);
  };

  // Η έναρξη είναι εκτός ωραρίου (ή η μέρα κλειστή) → το ωράριο της ημέρας επεκτείνεται αυτόματα
  const entryOutsideHours = () => {
    if (!entryPopover) return false;
    const duration = entryEstDuration();
    if (!duration) return false;
    const hours = effectiveHours(entryPopover.dateStr);
    if (hours.is_closed) return true;
    const startMin = timeToMinutes(entryPopover.time);
    return startMin < timeToMinutes(hours.open_time) || startMin >= timeToMinutes(hours.close_time);
  };

  // Ξεκινά μέσα στο ωράριο αλλά τελειώνει μετά το κλείσιμο → επιτρέπεται χωρίς αλλαγή ωραρίου
  const entryEndsAfterClose = () => {
    if (!entryPopover || entryOutsideHours()) return false;
    const duration = entryEstDuration();
    if (!duration) return false;
    const hours = effectiveHours(entryPopover.dateStr);
    return timeToMinutes(entryPopover.time) + duration > timeToMinutes(hours.close_time);
  };

  // Προσυμπλήρωση από ό,τι έχει γραφτεί στην αναζήτηση: αριθμοί → τηλέφωνο, αλλιώς → όνομα
  const openNewClientForm = () => setEntryPopover(p => {
    const typed = p.clientSearch.trim();
    const isPhone = typed && /^[\d\s+-]+$/.test(typed);
    return { ...p, selectedClient: null, newClient: { name: isPhone ? '' : typed, phone: isPhone ? typed.replace(/\D/g, '') : '' } };
  });

  const selectClient = (client) => setEntryPopover(p => ({ ...p, selectedClient: client, clientSearch: `${client.name} (${client.phone})`, newClient: null }));

  // Δημιουργία νέας πελάτισσας απευθείας από τη φόρμα ραντεβού
  const createClientFromEntry = async () => {
    const name = entryPopover.newClient.name.trim();
    const phone = entryPopover.newClient.phone.replace(/\D/g, '');
    if (!name || !/^\d{10}$/.test(phone)) return toast.error("Συμπληρώστε όνομα και τηλέφωνο (10 ψηφία).");
    setEntryPopover(p => ({ ...p, creatingClient: true }));
    try {
      const res = await fetch(`${apiUrl}/api/admin/users`, {
        method: 'POST', headers: getJsonHeaders(), body: JSON.stringify({ name, phone })
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        const existing = users.find(u => (u.phone || '').replace(/\D/g, '') === phone);
        if (existing) {
          selectClient(existing);
          return toast.info(`Υπάρχει ήδη πελάτισσα με αυτό το τηλέφωνο (${existing.name}) — επιλέχθηκε αυτή.`);
        }
      }
      if (!res.ok) throw new Error(data.error || "Σφάλμα δημιουργίας πελάτισσας.");
      selectClient(data.user);
      onUsersChanged();
      toast.success("Η πελάτισσα δημιουργήθηκε και επιλέχθηκε.");
    } catch (err) { toast.error(err.message || "Σφάλμα δημιουργίας πελάτισσας."); }
    finally { setEntryPopover(p => p && ({ ...p, creatingClient: false })); }
  };

  const entryConflict = () => entryPopover && findConflict({
    appointments, services, formatLocalDate,
    date: entryPopover.dateStr, time: entryPopover.time, duration: entryEstDuration()
  });

  const submitEntry = async () => {
    if (submittingRef.current) return;
    const duration = entryEstDuration();
    if (entryPopover.mode === 'book' && (!entryPopover.selectedClient || entryPopover.selectedServices.length === 0)) {
      return toast.error("Επιλέξτε πελάτισσα και τουλάχιστον μία υπηρεσία.");
    }
    if (!duration) return toast.error("Καθορίστε διάρκεια.");

    const startMin = timeToMinutes(entryPopover.time);
    const endMin = startMin + duration;
    const hours = effectiveHours(entryPopover.dateStr);
    const needsExtend = entryOutsideHours();
    const conflict = entryConflict();
    if (conflict) return toast.error(describeConflict(conflict, services, BLOCKED_CLIENT_NAME));

    let payload;
    if (entryPopover.mode === 'book') {
      const client = entryPopover.selectedClient;
      payload = {
        user_id: client.id, client_name: client.name, client_email: client.email, client_phone: client.phone,
        services: entryPopover.selectedServices, appointment_date: entryPopover.dateStr,
        appointment_time: entryPopover.time, payment_method: 'store'
      };
    } else {
      payload = {
        client_name: BLOCKED_CLIENT_NAME, client_email: 'admin@vdnails.com', client_phone: '0000000000',
        service_name: entryPopover.blockReason, appointment_date: entryPopover.dateStr, appointment_time: entryPopover.time,
        payment_method: 'store', payment_status: 'completed', status: 'confirmed', total_amount: 0, duration
      };
    }

    submittingRef.current = true;
    setSubmittingEntry(true);
    const previousOverride = hoursMap[entryPopover.dateStr];
    let extended = false;
    try {
      if (needsExtend) {
        const newOpen = hours.is_closed ? minutesToTime(startMin) : minutesToTime(Math.min(timeToMinutes(hours.open_time), startMin));
        const newClose = hours.is_closed ? minutesToTime(endMin) : minutesToTime(Math.max(timeToMinutes(hours.close_time), endMin));
        const hoursRes = await fetch(`${apiUrl}/api/admin/business-hours`, {
          method: 'POST', headers: getJsonHeaders(),
          body: JSON.stringify({ date: entryPopover.dateStr, open_time: newOpen, close_time: newClose })
        });
        if (!hoursRes.ok) throw new Error("Δεν ήταν δυνατή η επέκταση του ωραρίου.");
        extended = true;
      }
      const res = await fetch(`${apiUrl}/api/appointments/direct`, {
        method: 'POST', headers: getJsonHeaders(), body: JSON.stringify(payload)
      });
      if (!res.ok) { const errData = await res.json().catch(() => ({})); throw new Error(errData.error || "Σφάλμα."); }
      toast.success(entryPopover.mode === 'book' ? "Το ραντεβού καταχωρήθηκε!" : "Η ώρα κλειδώθηκε.");
      setEntryPopover(null);
      onAppointmentsChanged();
      fetchWeekHours();
    } catch (err) {
      // Αν το ωράριο επεκτάθηκε αλλά το ραντεβού δεν μπήκε, το ωράριο επιστρέφει όπως ήταν
      if (extended) {
        await (previousOverride
          ? fetch(`${apiUrl}/api/admin/business-hours`, { method: 'POST', headers: getJsonHeaders(), body: JSON.stringify({ date: entryPopover.dateStr, ...previousOverride }) })
          : fetch(`${apiUrl}/api/admin/business-hours/${entryPopover.dateStr}`, { method: 'DELETE', headers: getJsonHeaders() })
        ).catch(() => {});
        fetchWeekHours();
      }
      toast.error(err.message || "Σφάλμα καταχώρησης.");
    } finally {
      submittingRef.current = false;
      setSubmittingEntry(false);
    }
  };

  return (
    <div className="admin-card wk-cal">
      <div className="wk-cal-toolbar">
        <div className="wk-cal-nav">
          <button className="admin-icon-btn" onClick={() => setWeekStart(addDays(weekStart, -7))}><IconChevronLeft size={15} /></button>
          <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setWeekStart(getWeekStart(new Date()))}>Σήμερα</button>
          <button className="admin-icon-btn" onClick={() => setWeekStart(addDays(weekStart, 7))}><IconChevronRight size={15} /></button>
          <span className="wk-cal-range">{formatRangeLabel(weekDates)}</span>
        </div>
        <div style={{ position: 'relative' }}>
          <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setShowDatePicker(v => !v)}><IconCalendar size={14} /> Μετάβαση σε ημερομηνία</button>
          {showDatePicker && (
            <div className="wk-cal-datepicker-pop">
              <DatePicker inline locale="el" calendarClassName="vd-admin-calendar" selected={weekStart} onChange={(d) => { setWeekStart(getWeekStart(d)); setShowDatePicker(false); }} />
            </div>
          )}
        </div>
      </div>

      <div className="wk-cal-scroll">
        <div className="wk-cal-header-row">
          <div className="wk-cal-corner" />
          {weekDates.map(d => {
            const dateStr = formatLocalDate(d);
            const h = effectiveHours(dateStr);
            return (
              <div key={dateStr} className={`wk-cal-daycol-header${dateStr === todayStr ? ' is-today' : ''}`}>
                <span className="wk-cal-weekday">{WEEKDAY_LABELS[(d.getDay() + 6) % 7]}</span>
                <span className="wk-cal-daynum">{d.getDate()}</span>
                <button
                  className={`wk-cal-hours-pill${h.is_override ? ' is-override' : ''}`}
                  onClick={() => setHoursPopover({ dateStr, open_time: h.open_time || '', close_time: h.close_time || '', is_override: h.is_override })}
                >
                  <IconClock size={11} /> {h.is_closed ? 'Κλειστά' : `${h.open_time}–${h.close_time}`}
                </button>
              </div>
            );
          })}
        </div>

        <div className="wk-cal-body-wrap">
          <div className="wk-cal-hourlabels" style={{ height: gridHeight }}>
            {hourMarks.map(h => (
              <div key={h} className="wk-cal-hourlabel" style={{ top: (h - rangeStartHour) * 60 * PX_PER_MIN }}>{String(h).padStart(2, '0')}:00</div>
            ))}
          </div>

          {weekDates.map(d => {
            const dateStr = formatLocalDate(d);
            const h = effectiveHours(dateStr);
            // Κλειστή μέρα: όλη η στήλη σκιασμένη (open = close = αρχή πλέγματος)
            const openMin = h.is_closed ? rangeStartMin : timeToMinutes(h.open_time);
            const closeMin = h.is_closed ? rangeStartMin : timeToMinutes(h.close_time);
            const dayApts = appointments.filter(a => a.status !== 'cancelled' && formatLocalDate(a.appointment_date) === dateStr);
            const layout = layoutDay(dayApts, getAptDuration);

            return (
              <div key={dateStr} className="wk-cal-daycol" style={{ height: gridHeight }} onClick={(e) => handleSlotClick(dateStr, e)}>
                {openMin > rangeStartMin && <div className="wk-cal-deadzone" style={{ top: 0, height: (openMin - rangeStartMin) * PX_PER_MIN }} />}
                {closeMin < rangeStartMin + (rangeEndHour - rangeStartHour) * 60 && (
                  <div className="wk-cal-deadzone" style={{ top: (closeMin - rangeStartMin) * PX_PER_MIN, bottom: 0 }} />
                )}
                {hourMarks.map((hh, idx) => idx > 0 && <div key={hh} className="wk-cal-gridline" style={{ top: (hh - rangeStartHour) * 60 * PX_PER_MIN }} />)}

                {layout.map(({ apt, start, end, col, totalCols }) => {
                  const isBlocked = apt.client_name === BLOCKED_CLIENT_NAME;
                  const top = (start - rangeStartMin) * PX_PER_MIN;
                  const height = Math.max(26, (end - start) * PX_PER_MIN);
                  const widthPct = 100 / totalCols, leftPct = col * widthPct;
                  return (
                    <div
                      key={apt.id}
                      className={`wk-cal-block${isBlocked ? ' is-blocked' : ''}`}
                      style={{ top, height, left: `calc(${leftPct}% + 2px)`, width: `calc(${widthPct}% - 4px)` }}
                      title={`${minutesToTime(start)}–${minutesToTime(end)} · ${isBlocked ? BLOCKED_LABEL : apt.client_name} · ${apt.service_name}`}
                      onClick={(e) => { e.stopPropagation(); onEditAppointment(apt); }}
                    >
                      <strong>{isBlocked ? BLOCKED_LABEL : apt.client_name}</strong>
                      <span>{minutesToTime(start)}–{minutesToTime(end)}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {hoursPopover && (
        <div className="admin-panel-overlay" onClick={() => setHoursPopover(null)}>
          <div className="admin-panel" style={{ maxWidth: 340 }} onClick={e => e.stopPropagation()}>
            <div className="admin-panel-header">
              <h4 className="admin-h">Ωράριο — {hoursPopover.dateStr.split('-').reverse().join('/')}</h4>
              <button className="admin-icon-btn" onClick={() => setHoursPopover(null)}><IconX size={15} /></button>
            </div>
            <div className="admin-form">
              <div className="admin-form-row">
                <div className="admin-field">
                  <label className="admin-label">Έναρξη</label>
                  <TimeInput24 value={hoursPopover.open_time} onChange={v => setHoursPopover({ ...hoursPopover, open_time: v })} />
                </div>
                <div className="admin-field">
                  <label className="admin-label">Λήξη</label>
                  <TimeInput24 value={hoursPopover.close_time} onChange={v => setHoursPopover({ ...hoursPopover, close_time: v })} />
                </div>
              </div>
              <div className="admin-form-actions">
                <button className="admin-btn admin-btn-primary admin-btn-block" onClick={saveDayHours}>Αποθήκευση</button>
                {hoursPopover.is_override && <button className="admin-btn admin-btn-secondary" onClick={resetDayHours}>Επαναφορά</button>}
              </div>
            </div>
          </div>
        </div>
      )}

      {entryPopover && (
        <div className="admin-slideover-overlay" onClick={() => !submittingEntry && setEntryPopover(null)}>
          <div className="admin-slideover" onClick={e => e.stopPropagation()}>
            <div className="admin-flex-between" style={{ marginBottom: 4 }}>
              <h4 className="admin-h">Νέα καταχώρηση</h4>
              <button className="admin-icon-btn" onClick={() => setEntryPopover(null)}><IconX size={15} /></button>
            </div>
            <p className="admin-subtle" style={{ marginBottom: 16 }}>{entryPopover.dateStr.split('-').reverse().join('/')}</p>

            <div className="admin-pill-group" style={{ marginBottom: 18 }}>
              <button className={`admin-pill${entryPopover.mode === 'book' ? ' active' : ''}`} onClick={() => setEntryPopover({ ...entryPopover, mode: 'book' })}>Ραντεβού</button>
              <button className={`admin-pill${entryPopover.mode === 'block' ? ' active' : ''}`} onClick={() => setEntryPopover({ ...entryPopover, mode: 'block' })}>Κλείδωμα / Ρεπό</button>
            </div>

            <div className="admin-form">
              <div className="admin-field">
                <label className="admin-label">Ώρα</label>
                <TimeInput24 value={entryPopover.time} onChange={v => setEntryPopover({ ...entryPopover, time: v })} />
              </div>

              {entryPopover.mode === 'book' ? (
                <>
                  <div className="admin-field" style={{ position: 'relative' }}>
                    <label className="admin-label">Πελάτισσα</label>
                    <input
                      type="text" className="admin-input" placeholder="Αναζήτηση με όνομα, email ή τηλέφωνο…"
                      value={entryPopover.clientSearch}
                      onChange={e => setEntryPopover({ ...entryPopover, clientSearch: e.target.value, selectedClient: null })}
                    />
                    {entryPopover.clientSearch && !entryPopover.selectedClient && !entryPopover.newClient && (
                      <div style={{ position: 'absolute', zIndex: 10, top: '100%', marginTop: 4, background: '#fff', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', maxHeight: 220, overflowY: 'auto', width: '100%', boxShadow: 'var(--shadow)' }}>
                        {users.filter(u =>
                          u.name.toLowerCase().includes(entryPopover.clientSearch.toLowerCase()) ||
                          (u.email || '').toLowerCase().includes(entryPopover.clientSearch.toLowerCase()) ||
                          (u.phone || '').includes(entryPopover.clientSearch)
                        ).slice(0, 8).map(u => (
                          <div key={u.id} onClick={() => selectClient(u)}
                            style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--line-soft)' }}>
                            <strong style={{ fontSize: '0.87rem' }}>{u.name}</strong>
                            <span className="admin-cell-sub">{u.email || 'Χωρίς λογαριασμό'} · {u.phone}</span>
                          </div>
                        ))}
                        <div onClick={() => openNewClientForm()} style={{ padding: '10px 12px', cursor: 'pointer', color: 'var(--primary)', fontWeight: 600, fontSize: '0.85rem' }}>
                          + Νέα πελάτισσα «{entryPopover.clientSearch}»
                        </div>
                      </div>
                    )}
                    {!entryPopover.newClient && !entryPopover.selectedClient && !entryPopover.clientSearch && (
                      <button type="button" className="admin-btn admin-btn-secondary admin-btn-sm" style={{ marginTop: 8, alignSelf: 'flex-start' }} onClick={() => openNewClientForm()}>+ Νέα πελάτισσα</button>
                    )}
                  </div>
                  {entryPopover.newClient && (
                    <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <strong style={{ fontSize: '0.85rem' }}>Νέα πελάτισσα</strong>
                      <div className="admin-field">
                        <label className="admin-label">Όνομα</label>
                        <input type="text" className="admin-input" value={entryPopover.newClient.name} onChange={e => setEntryPopover({ ...entryPopover, newClient: { ...entryPopover.newClient, name: e.target.value } })} />
                      </div>
                      <div className="admin-field">
                        <label className="admin-label">Τηλέφωνο</label>
                        <input type="tel" className="admin-input" placeholder="10 ψηφία" value={entryPopover.newClient.phone} onChange={e => setEntryPopover({ ...entryPopover, newClient: { ...entryPopover.newClient, phone: e.target.value } })} />
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" className="admin-btn admin-btn-primary admin-btn-sm" disabled={entryPopover.creatingClient} onClick={createClientFromEntry}>
                          {entryPopover.creatingClient ? 'Δημιουργία…' : 'Δημιουργία & επιλογή'}
                        </button>
                        <button type="button" className="admin-btn admin-btn-secondary admin-btn-sm" disabled={entryPopover.creatingClient} onClick={() => setEntryPopover({ ...entryPopover, newClient: null })}>Άκυρο</button>
                      </div>
                    </div>
                  )}
                  <div className="admin-field">
                    <label className="admin-label">Υπηρεσίες</label>
                    <ServicePicker services={services} selected={entryPopover.selectedServices} onChange={(v) => setEntryPopover({ ...entryPopover, selectedServices: v })} />
                  </div>
                </>
              ) : (
                <>
                  <div className="admin-field">
                    <label className="admin-label">Διάρκεια (λεπτά)</label>
                    <input type="number" min="15" className="admin-input" value={entryPopover.blockDuration} onChange={e => setEntryPopover({ ...entryPopover, blockDuration: e.target.value })} />
                  </div>
                  <div className="admin-field">
                    <label className="admin-label">Αιτιολογία</label>
                    <input type="text" className="admin-input" value={entryPopover.blockReason} onChange={e => setEntryPopover({ ...entryPopover, blockReason: e.target.value })} />
                  </div>
                </>
              )}

              {entryOutsideHours() && (
                <div style={{ background: 'var(--warning-bg)', color: 'var(--warning)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                  {effectiveHours(entryPopover.dateStr).is_closed
                    ? 'Η ημέρα είναι κλειστή. Θα ανοίξει αυτόματα μόνο για το διάστημα αυτής της καταχώρησης.'
                    : `Εκτός τρέχοντος ωραρίου (${effectiveHours(entryPopover.dateStr).open_time}–${effectiveHours(entryPopover.dateStr).close_time}). Το ωράριο της ημέρας θα επεκταθεί αυτόματα.`}
                </div>
              )}
              {entryEndsAfterClose() && (
                <div style={{ background: 'var(--info-bg)', color: 'var(--info)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                  {`Θα τελειώσει στις ${minutesToTime(timeToMinutes(entryPopover.time) + entryEstDuration())}, μετά το κλείσιμο (${effectiveHours(entryPopover.dateStr).close_time}). Το ωράριο της ημέρας δεν αλλάζει.`}
                </div>
              )}

              {entryConflict() && (
                <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                  {describeConflict(entryConflict(), services, BLOCKED_CLIENT_NAME)} Επιλέξτε άλλη ώρα.
                </div>
              )}

              <button className="admin-btn admin-btn-primary admin-btn-block" onClick={submitEntry} disabled={submittingEntry || !!entryConflict()}>
                {submittingEntry ? 'Καταχώρηση…' : entryPopover.mode === 'book' ? 'Καταχώρηση ραντεβού' : 'Κλείδωμα ώρας'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

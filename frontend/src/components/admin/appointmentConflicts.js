// Προέλεγχος στο admin: βρίσκει ενεργό ραντεβού που πέφτει πάνω στο διάστημα [time, time + duration).
// Ο τελικός έλεγχος γίνεται πάντα στο backend — αυτός εδώ δίνει άμεση προειδοποίηση πριν την αποθήκευση.
const toMinutes = (t) => { const [h, m] = t.slice(0, 5).split(':').map(Number); return h * 60 + m; };

export const getAppointmentDuration = (apt, services) => {
  if (apt.duration) return parseInt(apt.duration);
  const svc = services.find(s => s.name === apt.service_name);
  return svc ? parseInt(svc.duration_minutes) : 60;
};

export const findConflict = ({ appointments, services, formatLocalDate, date, time, duration, excludeId = null }) => {
  if (!date || !time || !duration) return null;
  const start = toMinutes(time);
  const end = start + duration;
  return appointments.find(a =>
    a.id !== excludeId &&
    a.status !== 'cancelled' &&
    formatLocalDate(a.appointment_date) === date &&
    start < toMinutes(a.appointment_time) + getAppointmentDuration(a, services) &&
    toMinutes(a.appointment_time) < end
  ) || null;
};

export const describeConflict = (apt, services, blockedName) => {
  const start = apt.appointment_time.slice(0, 5);
  const endMin = toMinutes(start) + getAppointmentDuration(apt, services);
  const end = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
  const who = apt.client_name === blockedName ? 'κλειδωμένη ώρα / ρεπό' : apt.client_name;
  return `Υπάρχει ήδη ραντεβού ${start}–${end} (${who}).`;
};

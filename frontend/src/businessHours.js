// Προεπιλεγμένο εβδομαδιαίο ωράριο (κλειδί = Date.getDay(): 0 = Κυριακή ... 6 = Σάββατο).
// null = κλειστά. Ο τελικός έλεγχος γίνεται στο backend (backend/businessHours.js) — άλλαξέ τα μαζί.
export const WEEKLY_HOURS = {
  0: null,
  1: { open_time: '11:00', close_time: '18:00' },
  2: { open_time: '09:00', close_time: '21:00' },
  3: { open_time: '09:00', close_time: '18:00' },
  4: { open_time: '09:00', close_time: '18:00' },
  5: { open_time: '09:00', close_time: '21:00' },
  6: { open_time: '09:00', close_time: '18:00' },
};

// Σειρά εμφάνισης στο footer: Δευτέρα → Κυριακή
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

// Μέρες με ίδιο ωράριο σε μία ομάδα (με τη σειρά της πρώτης τους μέρας), π.χ. [{ days: [2, 5], hours: {...} }, ...]
export const groupWeeklyHours = () => {
  const groups = [];
  WEEKDAY_ORDER.forEach(day => {
    const hours = WEEKLY_HOURS[day];
    const key = hours ? `${hours.open_time}-${hours.close_time}` : 'closed';
    const group = groups.find(g => g.key === key);
    if (group) group.days.push(day);
    else groups.push({ key, days: [day], hours });
  });
  return groups;
};

export const getDefaultHours = (date) => WEEKLY_HOURS[date.getDay()] || null;

export const isOpenWeekday = (date) => !!getDefaultHours(date);

// Ελεύθερες ώρες έναρξης (ανά 30') που χωράνε ολόκληρες μέσα στο ωράριο και δεν πέφτουν πάνω σε άλλο ραντεβού
export const generateFreeSlots = ({ businessHours, bookedSlots, duration, isToday, currentMinutes }) => {
  if (!businessHours || businessHours.is_closed || !businessHours.open_time || !businessHours.close_time) return [];
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const toTime = (mins) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
  const startDay = toMin(businessHours.open_time);
  const endDay = toMin(businessHours.close_time);
  const slots = [];
  for (let start = startDay; start + duration <= endDay; start += 30) {
    if (isToday && start <= currentMinutes) continue;
    const end = start + duration;
    const overlaps = (bookedSlots || []).some(b => {
      if (!b.time) return false;
      const bStart = toMin(b.time);
      return start < bStart + b.duration && end > bStart;
    });
    if (!overlaps) slots.push(toTime(start));
  }
  return slots;
};

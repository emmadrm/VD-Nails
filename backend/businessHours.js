// Προεπιλεγμένο εβδομαδιαίο ωράριο (κλειδί = getUTCDay(): 0 = Κυριακή ... 6 = Σάββατο).
// null = κλειστά. Οι ειδικές ρυθμίσεις ανά ημερομηνία (πίνακας business_hours) υπερισχύουν.
// ΠΡΟΣΟΧΗ: το ίδιο ωράριο υπάρχει και στο frontend/src/businessHours.js — άλλαξέ τα μαζί.
const WEEKLY_HOURS = {
  0: null,
  1: { open_time: '11:00', close_time: '18:00' },
  2: { open_time: '09:00', close_time: '21:00' },
  3: { open_time: '09:00', close_time: '18:00' },
  4: { open_time: '09:00', close_time: '18:00' },
  5: { open_time: '09:00', close_time: '21:00' },
  6: { open_time: '09:00', close_time: '18:00' },
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

const isValidDate = (date) => {
  if (typeof date !== 'string' || !DATE_RE.test(date)) return false;
  const d = new Date(`${date}T00:00:00Z`);
  return !isNaN(d) && d.toISOString().slice(0, 10) === date;
};

const isValidTime = (time) => typeof time === 'string' && TIME_RE.test(time);

const toMinutes = (time) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const getDefaultHours = (date) => {
  if (!isValidDate(date)) return null;
  return WEEKLY_HOURS[new Date(`${date}T00:00:00Z`).getUTCDay()] || null;
};

// override: { open_time, close_time } από τον πίνακα business_hours ή undefined
const resolveHours = (date, override) => {
  if (override) {
    return { open_time: override.open_time.slice(0, 5), close_time: override.close_time.slice(0, 5), is_override: true, is_closed: false };
  }
  const hours = getDefaultHours(date);
  if (!hours) return { open_time: null, close_time: null, is_override: false, is_closed: true };
  return { ...hours, is_override: false, is_closed: false };
};

const fitsInHours = (hours, time, durationMinutes) => {
  if (!hours || hours.is_closed || !isValidTime(time)) return false;
  const duration = Number(durationMinutes);
  if (!Number.isInteger(duration) || duration <= 0) return false;
  const start = toMinutes(time);
  return start >= toMinutes(hours.open_time) && start + duration <= toMinutes(hours.close_time);
};

// Για τον admin: αρκεί η έναρξη να είναι μέσα στο ωράριο — το ραντεβού μπορεί να τελειώνει μετά το κλείσιμο
const startsWithinHours = (hours, time, durationMinutes) => {
  if (!hours || hours.is_closed || !isValidTime(time)) return false;
  const duration = Number(durationMinutes);
  if (!Number.isInteger(duration) || duration <= 0) return false;
  const start = toMinutes(time);
  return start >= toMinutes(hours.open_time) && start < toMinutes(hours.close_time) && start + duration <= 24 * 60;
};

module.exports = { WEEKLY_HOURS, isValidDate, isValidTime, resolveHours, fitsInHours, startsWithinHours };

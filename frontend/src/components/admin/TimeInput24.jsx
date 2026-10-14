import React from 'react';

// Επιλογή ώρας πάντα σε 24ωρη μορφή (το <input type="time"> ακολουθεί τη γλώσσα του browser και δείχνει π.μ./μ.μ.)
const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'));
const BASE_MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

export default function TimeInput24({ value, onChange, ariaLabel }) {
  const [hh = '', mm = ''] = (value || '').slice(0, 5).split(':');
  // Αν η αποθηκευμένη ώρα δεν πέφτει σε πεντάλεπτο (π.χ. 10:07), την κρατάμε ως επιλογή
  const minutes = mm && !BASE_MINUTES.includes(mm) ? [...BASE_MINUTES, mm].sort() : BASE_MINUTES;

  const emit = (h, m) => onChange(`${h || '00'}:${m || '00'}`);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} aria-label={ariaLabel}>
      <select className="admin-select" value={hh} onChange={e => emit(e.target.value, mm)} aria-label="Ώρα">
        {!hh && <option value="">--</option>}
        {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
      </select>
      <strong>:</strong>
      <select className="admin-select" value={mm} onChange={e => emit(hh, e.target.value)} aria-label="Λεπτά">
        {!mm && <option value="">--</option>}
        {minutes.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
    </div>
  );
}

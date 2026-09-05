import React from 'react';

// selected: array of { name, price, duration_minutes }
export default function ServicePicker({ services, selected, onChange }) {
  const isSelected = (svc) => selected.some(s => s.name === svc.name);

  const toggle = (svc) => {
    if (isSelected(svc)) {
      onChange(selected.filter(s => s.name !== svc.name));
    } else {
      onChange([...selected, { name: svc.name, price: Number(svc.price), duration_minutes: parseInt(svc.duration_minutes) }]);
    }
  };

  const totalPrice = selected.reduce((sum, s) => sum + Number(s.price || 0), 0);
  const totalDuration = selected.reduce((sum, s) => sum + parseInt(s.duration_minutes || 0), 0);

  return (
    <div className="admin-chip-field">
      <div className="admin-chip-options">
        {services.map(svc => (
          <button
            type="button"
            key={svc.id}
            className={`admin-chip${isSelected(svc) ? ' selected' : ''}`}
            onClick={() => toggle(svc)}
          >
            {svc.name} · {Number(svc.price).toFixed(2)}€
          </button>
        ))}
      </div>
      <div className="admin-chip-summary">
        <span>{selected.length} επιλεγμένες υπηρεσίες</span>
        <span>Σύνολο: {totalPrice.toFixed(2)}€ · {totalDuration}λ</span>
      </div>
    </div>
  );
}

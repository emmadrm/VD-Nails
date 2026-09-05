import React from 'react';
import { IconCalendar, IconCalendarCheck, IconBox, IconTag, IconChart, IconUsers, IconLogout } from './icons';

const NAV_GROUPS = [
  {
    label: 'Ραντεβού',
    items: [
      { key: 'appointments', label: 'Λίστα ραντεβού', icon: IconCalendarCheck },
      { key: 'calendar', label: 'Ημερολόγιο', icon: IconCalendar }
    ]
  },
  {
    label: 'Κατάστημα',
    items: [
      { key: 'orders', label: 'Παραγγελίες', icon: IconBox },
      { key: 'products', label: 'Προϊόντα', icon: IconTag },
      { key: 'services', label: 'Υπηρεσίες', icon: IconTag }
    ]
  },
  {
    label: 'Επισκόπηση',
    items: [
      { key: 'stats', label: 'Στατιστικά', icon: IconChart },
      { key: 'users', label: 'Πελάτες', icon: IconUsers }
    ]
  }
];

export default function AdminSidebar({ activeTab, onSelectTab, counts, onLogout, isOpen, onClose }) {
  return (
    <>
      <div className={`admin-sidebar-backdrop${isOpen ? ' visible' : ''}`} onClick={onClose} />
      <aside className={`admin-sidebar${isOpen ? ' mobile-open' : ''}`}>
        <div className="admin-sidebar-brand">
          <h1>VD Nails Suite</h1>
          <p>Κέντρο ελέγχου επιχείρησης</p>
        </div>

        {NAV_GROUPS.map(group => (
          <React.Fragment key={group.label}>
            <div className="admin-nav-group">{group.label}</div>
            {group.items.map(item => {
              const ItemIcon = item.icon;
              return (
                <button
                  key={item.key}
                  className={`admin-sidebar-item${activeTab === item.key ? ' active' : ''}`}
                  onClick={() => { onSelectTab(item.key); onClose?.(); }}
                >
                  <ItemIcon size={17} />
                  <span>{item.label}</span>
                  {counts?.[item.key] != null && <span className="badge">{counts[item.key]}</span>}
                </button>
              );
            })}
          </React.Fragment>
        ))}

        <div className="admin-sidebar-footer">
          <button className="admin-sidebar-item" onClick={onLogout}>
            <IconLogout size={17} />
            <span>Αποσύνδεση</span>
          </button>
        </div>
      </aside>
    </>
  );
}

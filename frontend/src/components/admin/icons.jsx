import React from 'react';

const Icon = ({ children, size = 16, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    width={size}
    height={size}
    {...props}
  >
    {children}
  </svg>
);

export const IconCalendar = (p) => <Icon {...p}><rect x="3" y="4" width="18" height="18" rx="3" /><path d="M8 2v4M16 2v4M3 10h18" /></Icon>;
export const IconCalendarCheck = (p) => <Icon {...p}><rect x="3" y="4" width="18" height="18" rx="3" /><path d="M8 2v4M16 2v4M3 10h18" /><path d="M8 15l2.5 2.5L16 12" /></Icon>;
export const IconClock = (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></Icon>;
export const IconLock = (p) => <Icon {...p}><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></Icon>;
export const IconBox = (p) => <Icon {...p}><path d="M21 8L12 3 3 8v8l9 5 9-5V8z" /><path d="M3 8l9 5 9-5M12 13v8" /></Icon>;
export const IconTag = (p) => <Icon {...p}><path d="M6 4l3 3-6 6a2 2 0 0 0 3 3l6-6 3 3" /><path d="M15 6l3-3 3 3-3 3z" /><path d="M14 7l7 7-2 2-7-7" /></Icon>;
export const IconChart = (p) => <Icon {...p}><path d="M3 3v18h18" /><rect x="7" y="12" width="3" height="6" /><rect x="12" y="8" width="3" height="10" /><rect x="17" y="5" width="3" height="13" /></Icon>;
export const IconUsers = (p) => <Icon {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6" /><path d="M17 8.5a3 3 0 1 0 0-6" /><path d="M16 14c2.5.5 5 2.5 5 6" /></Icon>;
export const IconLogout = (p) => <Icon {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></Icon>;
export const IconEdit = (p) => <Icon {...p}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></Icon>;
export const IconTrash = (p) => <Icon {...p}><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></Icon>;
export const IconCheck = (p) => <Icon {...p}><path d="M20 6L9 17l-5-5" /></Icon>;
export const IconPlus = (p) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>;
export const IconX = (p) => <Icon {...p}><path d="M18 6L6 18M6 6l12 12" /></Icon>;
export const IconSearch = (p) => <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></Icon>;
export const IconPhone = (p) => <Icon {...p}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></Icon>;
export const IconMail = (p) => <Icon {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></Icon>;
export const IconStar = (p) => <Icon {...p}><path d="M12 2l3 6.5 7 .9-5.1 4.8 1.3 6.9L12 17.8 5.8 21.1l1.3-6.9L2 9.4l7-.9z" /></Icon>;
export const IconCrown = (p) => <Icon {...p}><path d="M3 8l4 3 5-6 5 6 4-3-2 10H5z" /><path d="M5 21h14" /></Icon>;
export const IconChevronDown = (p) => <Icon {...p}><path d="M6 9l6 6 6-6" /></Icon>;
export const IconChevronLeft = (p) => <Icon {...p}><path d="M15 18l-6-6 6-6" /></Icon>;
export const IconChevronRight = (p) => <Icon {...p}><path d="M9 18l6-6-6-6" /></Icon>;
export const IconHistory = (p) => <Icon {...p}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /><path d="M12 7v5l3 3" /></Icon>;
export const IconEuro = (p) => <Icon {...p}><path d="M17 6.5A6.5 6.5 0 1 0 17 17.5" /><path d="M4 10h9M4 14h9" /></Icon>;
export const IconReceipt = (p) => <Icon {...p}><path d="M6 2h12v20l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></Icon>;
export const IconAlert = (p) => <Icon {...p}><path d="M10.3 3.86l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.14l-8-14a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></Icon>;
export const IconRefresh = (p) => <Icon {...p}><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v6h-6" /></Icon>;
export const IconImage = (p) => <Icon {...p}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="M21 15l-5-5L5 21" /></Icon>;
export const IconMenu = (p) => <Icon {...p}><path d="M4 6h16M4 12h16M4 18h16" /></Icon>;

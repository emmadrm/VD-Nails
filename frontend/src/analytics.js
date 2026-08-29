const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

let initialized = false;
let lastTrackedPath = null;

export function initGA() {
  if (initialized || !GA_ID || typeof window === 'undefined') return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID);

  initialized = true;
  lastTrackedPath = window.location.pathname + window.location.search;
}

export function trackPageView(path) {
  if (!initialized || typeof window.gtag !== 'function' || path === lastTrackedPath) return;
  lastTrackedPath = path;
  window.gtag('event', 'page_view', { page_path: path });
}

export function disableGA() {
  if (GA_ID && typeof window !== 'undefined') {
    window[`ga-disable-${GA_ID}`] = true;
  }
}

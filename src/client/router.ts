import { useEffect, useState } from 'react';

// Plain #name routes only (works inside sandboxed hosts that pass just a simple hash).
export const ROUTES = ['welcome', 'sign-in', 'register', 'dashboard', 'analyse', 'saved', 'plans', 'profile'] as const;
export type Route = (typeof ROUTES)[number];
export const APP_ROUTES: Route[] = ['dashboard', 'analyse', 'saved', 'plans', 'profile'];

function read(): Route {
  const h = location.hash.replace(/^#/, '');
  return (ROUTES as readonly string[]).includes(h) ? (h as Route) : 'welcome';
}

export function navigate(r: Route) {
  if (location.hash.replace(/^#/, '') === r) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = r;
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(read);
  useEffect(() => {
    const on = () => setRoute(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

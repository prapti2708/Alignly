import { useCallback, useEffect, useState } from 'react';
import { currentSession, signOut, type Session } from './auth.ts';
import { APP_ROUTES, navigate, useRoute, type Route } from './router.ts';
import { Landing } from './pages/Landing.tsx';
import { Auth } from './pages/Auth.tsx';
import { Dashboard } from './pages/Dashboard.tsx';
import { continueAsGuest } from './auth.ts';

export function App() {
  const route = useRoute();
  const [session, setSession] = useState<Session | null>(() => currentSession());
  const [autoSample, setAutoSample] = useState(false);

  // Guard app pages; send signed-in visitors away from the auth pages.
  // Read the live hash: after sign-out the hash has already moved on even if the route state hasn't.
  useEffect(() => {
    const live = (location.hash.replace(/^#/, '') || 'welcome') as Route;
    if (APP_ROUTES.includes(live) && !session) navigate('sign-in');
    if ((live === 'sign-in' || live === 'register') && session && !session.guest) navigate('dashboard');
  }, [route, session]);

  useEffect(() => {
    const titles: Record<Route, string> = {
      welcome: 'Alignly · Align your resume to the role', 'sign-in': 'Sign in · Alignly', register: 'Create account · Alignly',
      dashboard: 'Dashboard · Alignly', analyse: 'New analysis · Alignly', saved: 'Saved analyses · Alignly', plans: 'Learning plans · Alignly', profile: 'Profile · Alignly',
    };
    document.title = titles[route];
    window.scrollTo({ top: 0 });
  }, [route]);

  const onAuthed = useCallback((s: Session) => { setSession(s); navigate('dashboard'); }, []);
  const doSignOut = useCallback(() => { signOut(); setSession(null); navigate('welcome'); }, []);
  const demo = useCallback(() => {
    if (!session) setSession(continueAsGuest());
    setAutoSample(true);
    navigate('analyse');
  }, [session]);
  const clearAuto = useCallback(() => setAutoSample(false), []);

  return (
    <div className="relative min-h-screen overflow-x-clip">
      <div className="aurora" aria-hidden><span /></div>
      <div className="relative z-10">
        {route === 'welcome' && (
          <Landing session={session} onSignIn={() => navigate('sign-in')} onRegister={() => navigate('register')} onDemo={demo} onDashboard={() => navigate('dashboard')} />
        )}
        {(route === 'sign-in' || route === 'register') && (
          <Auth key={route} mode={route} onDone={onAuthed} onSwitch={(m) => navigate(m)} onHome={() => navigate('welcome')} />
        )}
        {APP_ROUTES.includes(route) && session && (
          <Dashboard session={session} route={route} go={navigate} onSignOut={doSignOut} onSession={setSession} autoSample={autoSample} onAutoSampleUsed={clearAuto} />
        )}
      </div>
    </div>
  );
}

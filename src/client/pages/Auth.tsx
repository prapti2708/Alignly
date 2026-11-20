import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { Icon } from '../components/Icons.tsx';
import { Logo } from '../components/Logo.tsx';
import { continueAsGuest, register, signIn, validateEmail, type Session } from '../auth.ts';
import { storageAvailable } from '../storage.ts';

interface Props {
  mode: 'sign-in' | 'register';
  onDone: (s: Session) => void;
  onSwitch: (m: 'sign-in' | 'register') => void;
  onHome: () => void;
}

function Field({ id, label, type = 'text', value, onChange, error, autoComplete, hint, icon, trailing }: {
  id: string; label: string; type?: string; value: string; onChange: (v: string) => void; error?: string; autoComplete?: string; hint?: string; icon: string; trailing?: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold">{label}</label>
      <div className={`mt-1.5 flex items-center gap-2 rounded-xl border bg-white px-3.5 transition-colors focus-within:border-ink-3 ${error ? 'border-ember' : 'rule'}`}>
        <Icon name={icon} className="w-4 h-4 text-ink-3" />
        <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete}
          aria-invalid={!!error} aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
          className="flex-1 min-w-0 bg-transparent py-3 text-[0.95rem] outline-none placeholder:text-ink-3/60" />
        {trailing}
      </div>
      {error ? <p id={`${id}-err`} className="mt-1.5 text-xs text-ember">{error}</p> : hint ? <p id={`${id}-hint`} className="mt-1.5 text-xs text-ink-3">{hint}</p> : null}
    </div>
  );
}

function strength(p: string): { score: number; label: string } {
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p) || /[^A-Za-z0-9]/.test(p)) s++;
  return { score: s, label: ['Too short', 'Weak', 'Okay', 'Good', 'Strong'][s] };
}

export function Auth({ mode, onDone, onSwitch, onHome }: Props) {
  const reg = mode === 'register';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [college, setCollege] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [remember, setRemember] = useState(true);
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const ids = { name: useId(), email: useId(), college: useId(), pw: useId(), confirm: useId() };
  const persistent = storageAvailable();
  const st = strength(password);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    const errs: Record<string, string> = {};
    if (reg && name.trim().length < 2) errs.name = 'Enter your name.';
    if (!validateEmail(email)) errs.email = 'Enter a valid email address, like name@college.edu.';
    if (password.length < (reg ? 8 : 1)) errs.pw = reg ? 'Use at least 8 characters.' : 'Enter your password.';
    if (reg && confirm !== password) errs.confirm = 'Passwords don’t match.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const s = reg ? await register({ name, email, password, college }) : await signIn(email, password, remember);
      onDone(s);
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const eye = (
    <button type="button" onClick={() => setShow((v) => !v)} className="text-ink-3 hover:text-ink p-1" aria-label={show ? 'Hide password' : 'Show password'}>
      <Icon name="eye" className="w-4 h-4" />
    </button>
  );

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[1fr_1.05fr]">
      {/* Brand panel */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-linear-to-br from-petal via-peach to-sage p-12">
        <div className="absolute -left-24 top-1/3 w-96 h-96 rounded-full bg-blush/70 blur-3xl" aria-hidden />
        <div className="absolute right-0 -bottom-20 w-96 h-96 rounded-full bg-sage blur-3xl" aria-hidden />
        <div className="relative"><Logo onClick={onHome} /></div>
        <div className="relative max-w-md">
          <p className="wordmark text-[5.5rem] text-ink" aria-hidden>alignly</p>
          <p className="font-serif text-[2.2rem] leading-[1.1] mt-5">Every requirement, with evidence.</p>
          <ul className="mt-6 space-y-3 text-ink-2">
            {['Exact JD line and resume excerpt for every skill', 'Required, preferred and “not needed” kept apart', 'A 14-day plan for your top three gaps'].map((t) => (
              <li key={t} className="flex items-start gap-3"><span className="grid place-items-center w-6 h-6 rounded-full bg-white/80 text-teal shrink-0"><Icon name="check" className="w-3.5 h-3.5" /></span>{t}</li>
            ))}
          </ul>
          <div className="mt-10 card-solid p-4 rotate-[-1.5deg] max-w-sm" aria-hidden>
            <div className="flex items-center justify-between"><span className="chip chip-gap"><Icon name="gap" className="w-3.5 h-3.5" /> Gap 1 · Required</span><span className="text-xs text-ink-3">Days 1–4</span></div>
            <p className="font-serif text-xl mt-2">Docker</p>
            <p className="text-sm text-ink-3">Day 1 · Run your first containers · 30 min</p>
          </div>
        </div>
        <p className="relative text-xs text-ink-2">Built for Code Fuzion 2026</p>
      </aside>

      {/* Form */}
      <main className="relative min-w-0 flex flex-col px-5 sm:px-10 py-8">
        <div className="flex items-center justify-between">
          <span className="lg:hidden"><Logo sub={false} onClick={onHome} /></span>
          <button className="ml-auto text-sm link text-ink-2 inline-flex items-center gap-1.5" onClick={onHome}><Icon name="back" className="w-3.5 h-3.5" /> Back to home</button>
        </div>
        <div className="flex-1 grid grid-cols-[minmax(0,1fr)] place-items-center py-10">
          <div className="w-full max-w-md min-w-0 rise">
            <p className="eyebrow">{reg ? 'Create your account' : 'Welcome back'}</p>
            <h1 className="font-serif text-[2.3rem] leading-tight mt-2">{reg ? 'Start aligning your resume' : 'Sign in to Alignly'}</h1>
            <p className="mt-2 text-ink-2">{reg ? 'Save analyses and track your two-week plans on your dashboard.' : 'Pick up your saved analyses and plans where you left off.'}</p>

            <form onSubmit={submit} noValidate className="mt-8 card-solid p-6 sm:p-7 space-y-4">
              {reg && <Field id={ids.name} label="Full name" value={name} onChange={setName} error={errors.name} autoComplete="name" icon="user" />}
              <Field id={ids.email} label="Email" type="email" value={email} onChange={setEmail} error={errors.email} autoComplete="email" icon="mail" />
              {reg && <Field id={ids.college} label="College (optional)" value={college} onChange={setCollege} autoComplete="organization" icon="book" />}
              <div>
                <Field id={ids.pw} label="Password" type={show ? 'text' : 'password'} value={password} onChange={setPassword} error={errors.pw} autoComplete={reg ? 'new-password' : 'current-password'} icon="lock" trailing={eye} hint={reg ? 'At least 8 characters.' : undefined} />
                {reg && password && (
                  <div className="mt-2 flex items-center gap-2" aria-live="polite">
                    <div className="flex-1 grid grid-cols-4 gap-1" aria-hidden>
                      {[0, 1, 2, 3].map((i) => <span key={i} className={`h-1.5 rounded-full ${i < st.score ? ['bg-blush', 'bg-honey', 'bg-[#9fbfae]', 'bg-teal'][st.score - 1] : 'bg-mist'}`} />)}
                    </div>
                    <span className="text-xs text-ink-3 w-16 text-right">{st.label}</span>
                  </div>
                )}
              </div>
              {reg && <Field id={ids.confirm} label="Confirm password" type={show ? 'text' : 'password'} value={confirm} onChange={setConfirm} error={errors.confirm} autoComplete="new-password" icon="lock" />}
              {!reg && (
                <label className="flex items-center gap-2 text-sm text-ink-2 cursor-pointer">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="w-4 h-4 accent-[#3d6b59]" /> Keep me signed in on this device
                </label>
              )}
              {formError && <p role="alert" className="rounded-xl bg-apricot/60 border border-honey px-3.5 py-2.5 text-sm flex gap-2"><Icon name="alert" className="w-4 h-4 text-ember mt-0.5" /> {formError}</p>}
              <button type="submit" className="btn btn-ink w-full justify-center py-3!" disabled={busy}>
                {busy ? 'Please wait…' : reg ? 'Create account' : 'Sign in'} {!busy && <Icon name="arrow" />}
              </button>
              <div className="flex items-center gap-3 text-xs text-ink-3" aria-hidden><span className="flex-1 h-px bg-rule" /> or <span className="flex-1 h-px bg-rule" /></div>
              <button type="button" className="btn btn-line w-full justify-center" onClick={() => onDone(continueAsGuest())}>Continue as guest</button>
            </form>

            <p className="mt-6 text-sm text-center text-ink-2">
              {reg ? 'Already have an account?' : 'New to Alignly?'}{' '}
              <button className="link font-semibold text-ink" onClick={() => onSwitch(reg ? 'sign-in' : 'register')}>{reg ? 'Sign in' : 'Create an account'}</button>
            </p>
            <p className="mt-4 text-xs text-ink-3 text-center flex items-start justify-center gap-1.5">
              <Icon name="lock" className="w-3.5 h-3.5 mt-0.5" />
              <span>Accounts are stored only in this browser{persistent ? '' : ' for this visit (storage is blocked here)'}. Passwords are kept as salted hashes, never in plain text.</span>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

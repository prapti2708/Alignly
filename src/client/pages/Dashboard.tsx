import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Icon } from '../components/Icons.tsx';
import { Logo, LogoMark } from '../components/Logo.tsx';
import { Analyzer } from '../Analyzer.tsx';
import { deleteAccount, getAccount, updateProfile, type Session } from '../auth.ts';
import { deleteAllSaved, deleteSaved, listSaved, summarize, type SavedAnalysis } from '../saved.ts';
import type { Route } from '../router.ts';
import { STATIC } from '../mode.ts';

interface Props {
  session: Session;
  route: Route;
  go: (r: Route) => void;
  onSignOut: () => void;
  onSession: (s: Session) => void;
  autoSample: boolean;
  onAutoSampleUsed: () => void;
}

const NAV: { route: Route; label: string; icon: string }[] = [
  { route: 'dashboard', label: 'Overview', icon: 'home' },
  { route: 'analyse', label: 'New analysis', icon: 'plus' },
  { route: 'saved', label: 'Saved analyses', icon: 'folder' },
  { route: 'plans', label: 'Learning plans', icon: 'calendar' },
  { route: 'profile', label: 'Profile', icon: 'user' },
];

const greeting = () => {
  const h = new Date().getHours();
  return h < 5 ? 'Working late' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};
const fmtDate = (t: number) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const initials = (n: string) => n.split(/\s+/).map((x) => x[0]).join('').slice(0, 2).toUpperCase();

export function Dashboard({ session, route, go, onSignOut, onSession, autoSample, onAutoSampleUsed }: Props) {
  const [version, setVersion] = useState(0);
  const [open, setOpen] = useState<{ item: SavedAnalysis; plan: boolean } | null>(null);
  const [analyzerKey, setAnalyzerKey] = useState(0);
  const saved = useMemo(() => listSaved(session.userId), [session.userId, version]); // eslint-disable-line react-hooks/exhaustive-deps
  const refresh = () => setVersion((v) => v + 1);
  // The sample starts inside the analyzer's own effect (children run first); then clear the flag.
  useEffect(() => { if (autoSample && route === 'analyse') onAutoSampleUsed(); }, [autoSample, route, onAutoSampleUsed]);

  const openSaved = (item: SavedAnalysis, plan = false) => {
    setOpen({ item, plan });
    setAnalyzerKey((k) => k + 1);
    go('analyse');
  };
  const newAnalysis = () => { setOpen(null); setAnalyzerKey((k) => k + 1); go('analyse'); };

  let content: ReactNode;
  if (route === 'analyse') {
    content = (
      <Analyzer key={analyzerKey} session={session} open={open?.item} focusPlan={open?.plan} autoSample={autoSample && !open}
        onSaved={() => { refresh(); }} />
    );
  } else if (route === 'saved') content = <SavedPage items={saved} onOpen={openSaved} onDelete={(id) => { deleteSaved(session.userId, id); refresh(); }} onNew={newAnalysis} />;
  else if (route === 'plans') content = <PlansPage items={saved} onOpen={openSaved} onNew={newAnalysis} />;
  else if (route === 'profile') content = <ProfilePage session={session} onSession={onSession} onSignOut={onSignOut} onDeleted={() => { deleteAllSaved(session.userId); if (!session.guest) deleteAccount(session.userId); onSignOut(); }} count={saved.length} />;
  else content = <Overview session={session} items={saved} onOpen={openSaved} onNew={newAnalysis} go={go} />;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16.5rem_1fr]">
      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex flex-col sticky top-0 h-screen border-r rule bg-white/55 backdrop-blur-md px-4 py-6">
        <div className="px-2"><Logo onClick={() => go('welcome')} /></div>
        <nav aria-label="Dashboard" className="mt-8 space-y-1">
          {NAV.map((n) => {
            const active = route === n.route;
            return (
              <button key={n.route} onClick={() => (n.route === 'analyse' ? newAnalysis() : go(n.route))} aria-current={active ? 'page' : undefined}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${active ? 'bg-peach text-ink shadow-[inset_0_0_0_1px_var(--color-apricot)]' : 'text-ink-2 hover:bg-shell'}`}>
                <span className={`grid place-items-center w-8 h-8 rounded-lg ${active ? 'bg-honey' : 'bg-shell'}`}><Icon name={n.icon} className="w-4 h-4" /></span>
                {n.label}
                {n.route === 'saved' && saved.length > 0 && <span className="ml-auto chip chip-quiet">{saved.length}</span>}
              </button>
            );
          })}
        </nav>
        <div className="mt-auto">
          <div className="rounded-2xl bg-linear-to-br from-sage to-mist p-4 text-sm">
            <p className="font-semibold">Tip</p>
            <p className="mt-1 text-ink-2">Fix a missing skill by naming it where you used it, then rerun the analysis.</p>
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-2xl border rule bg-white/80 p-3">
            <span className="grid place-items-center w-10 h-10 rounded-full bg-blush font-semibold text-sm">{initials(session.name)}</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate">{session.name}</p>
              <p className="text-xs text-ink-3 truncate">{session.guest ? 'Guest session' : session.email}</p>
            </div>
            <button className="p-2 rounded-lg hover:bg-shell text-ink-2" onClick={onSignOut} aria-label="Sign out" title="Sign out"><Icon name="logout" className="w-4 h-4" /></button>
          </div>
        </div>
      </aside>

      {/* Top bar (mobile/tablet) */}
      <div className="lg:hidden sticky top-0 z-30 border-b rule bg-paper/80 backdrop-blur-md">
        <div className="px-5 h-14 flex items-center justify-between">
          <Logo sub={false} onClick={() => go('welcome')} />
          <button className="p-2 rounded-lg hover:bg-shell text-ink-2" onClick={onSignOut} aria-label="Sign out"><Icon name="logout" className="w-4 h-4" /></button>
        </div>
        <nav aria-label="Dashboard" className="flex gap-1 overflow-x-auto px-4 pb-2.5 -mt-1">
          {NAV.map((n) => (
            <button key={n.route} onClick={() => (n.route === 'analyse' ? newAnalysis() : go(n.route))} aria-current={route === n.route ? 'page' : undefined}
              className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${route === n.route ? 'bg-ink text-white' : 'bg-white/70 text-ink-2 border rule'}`}>
              <Icon name={n.icon} className="w-3.5 h-3.5" /> {n.label}
            </button>
          ))}
        </nav>
      </div>

      <main className="min-w-0 relative">
        {content}
        <footer className="mx-auto max-w-6xl px-5 sm:px-8 py-8 mt-10 border-t rule text-xs text-ink-3 flex flex-col sm:flex-row gap-2 justify-between">
          <p className="flex items-center gap-2"><Icon name="lock" className="w-3.5 h-3.5" /> {STATIC ? 'Your resume is read and analysed on this device and never uploaded.' : 'Your PDF is read on the server for one request and not stored.'} Saved items stay in this browser.</p>
          <p>Alignly · Built for Code Fuzion 2026</p>
        </footer>
      </main>
    </div>
  );
}

function PageHead({ kicker, title, sub, action }: { kicker: string; title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow">{kicker}</p>
        <h1 className="font-serif text-[2.1rem] sm:text-[2.6rem] leading-tight mt-1">{title}</h1>
        {sub && <p className="mt-2 text-ink-2 max-w-2xl">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

function Ring({ pct, size = 56, color = '#9fbfae' }: { pct: number; size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 36 36" style={{ width: size, height: size }} className="-rotate-90" aria-hidden>
      <circle cx="18" cy="18" r="15" fill="none" stroke="var(--color-mist)" strokeWidth="3.5" />
      <circle cx="18" cy="18" r="15" fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${(pct / 100) * 94.2} 94.2`} />
    </svg>
  );
}

function AnalysisCard({ item, onOpen }: { item: SavedAnalysis; onOpen: (i: SavedAnalysis, plan?: boolean) => void }) {
  const s = summarize(item);
  const gaps = s.analysis.items.filter((i) => i.status === 'missing').sort((a, b) => (a.gapRank ?? 0) - (b.gapRank ?? 0));
  return (
    <li className="card-solid p-5 lift flex flex-col">
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          <Ring pct={s.pct} />
          <span className="absolute inset-0 grid place-items-center text-xs font-bold">{s.pct}%</span>
        </div>
        <div className="min-w-0">
          <p className="font-semibold leading-snug line-clamp-2">{item.title}</p>
          <p className="text-xs text-ink-3 mt-1">{fmtDate(item.createdAt)} · {item.resumeName}</p>
        </div>
      </div>
      <p className="mt-4 text-sm text-ink-2">{s.analysis.summary}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {gaps.slice(0, 4).map((g) => <span key={g.key} className={`chip ${g.strength === 'preferred' ? 'bg-rose text-ochre' : 'chip-gap'}`}>{g.canonical}</span>)}
        {!gaps.length && <span className="chip chip-match">No verified gaps</span>}
      </div>
      <div className="mt-auto pt-5 flex items-center gap-3">
        <button className="btn btn-ink py-2! text-sm!" onClick={() => onOpen(item)}>Open results</button>
        {s.plan.days.length > 0 && <button className="text-sm link" onClick={() => onOpen(item, true)}>Plan · {s.doneCount}/14 days</button>}
      </div>
    </li>
  );
}

function EmptyState({ title, text, onNew }: { title: string; text: string; onNew: () => void }) {
  return (
    <div className="mt-8 card-solid p-10 text-center relative overflow-hidden">
      <div className="absolute -left-16 -top-16 w-56 h-56 rounded-full bg-peach blur-2xl" aria-hidden />
      <div className="absolute -right-16 -bottom-16 w-56 h-56 rounded-full bg-sage blur-2xl" aria-hidden />
      <div className="relative">
        <LogoMark className="w-14 h-14 mx-auto" />
        <p className="font-serif text-2xl mt-5">{title}</p>
        <p className="mt-2 text-ink-2 max-w-md mx-auto">{text}</p>
        <button className="btn btn-ink mt-6" onClick={onNew}><Icon name="plus" /> New analysis</button>
      </div>
    </div>
  );
}

function Overview({ session, items, onOpen, onNew, go }: { session: Session; items: SavedAnalysis[]; onOpen: (i: SavedAnalysis, plan?: boolean) => void; onNew: () => void; go: (r: Route) => void }) {
  const sums = useMemo(() => items.map((i) => ({ item: i, ...summarize(i) })), [items]);
  const avg = sums.length ? Math.round(sums.reduce((a, s) => a + s.pct, 0) / sums.length) : 0;
  const daysDone = sums.reduce((a, s) => a + s.doneCount, 0);
  const active = sums.find((s) => s.plan.days.length && s.doneCount < s.plan.days.length);
  const first = session.name.split(' ')[0];
  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8 pt-8 rise">
      <section className="relative overflow-hidden rounded-[1.75rem] bg-linear-to-br from-peach via-petal to-sage p-7 sm:p-10">
        <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-white/50 blur-2xl" aria-hidden />
        <div className="relative grid md:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <p className="eyebrow text-ink-2!">Dashboard</p>
            <h1 className="font-serif text-[2.2rem] sm:text-[2.9rem] leading-tight mt-1">{greeting()}, {first}.</h1>
            <p className="mt-2 text-ink-2 max-w-xl">{items.length ? 'Here’s where your applications stand. Open an analysis or start a new one for the next role on your list.' : 'Start with your first analysis: add your resume and a job description, and Alignly will show the evidence for every requirement.'}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="btn btn-ink" onClick={onNew}><Icon name="plus" /> New analysis</button>
          </div>
        </div>
      </section>

      <dl className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Saved analyses', value: String(items.length), icon: 'folder', bg: 'bg-blush/60' },
          { label: 'Average evidence', value: items.length ? `${avg}%` : '—', icon: 'target', bg: 'bg-sage/70' },
          { label: 'Plan days done', value: String(daysDone), icon: 'calendar', bg: 'bg-apricot/70' },
          { label: 'Open gaps (latest)', value: sums[0] ? String(sums[0].analysis.items.filter((i) => i.status === 'missing').length) : '—', icon: 'gap', bg: 'bg-rose/70' },
        ].map((s) => (
          <div key={s.label} className="card-solid p-5 flex items-center gap-4">
            <span className={`grid place-items-center w-11 h-11 rounded-2xl ${s.bg}`}><Icon name={s.icon} className="w-5 h-5" /></span>
            <div><dt className="text-xs text-ink-3 font-semibold">{s.label}</dt><dd className="font-serif text-[1.7rem] leading-tight">{s.value}</dd></div>
          </div>
        ))}
      </dl>

      <div className="mt-6 grid lg:grid-cols-[1.6fr_1fr] gap-5 items-start">
        <section aria-labelledby="recent-h">
          <div className="flex items-baseline justify-between">
            <h2 id="recent-h" className="font-serif text-2xl">Recent analyses</h2>
            {items.length > 0 && <button className="text-sm link" onClick={() => go('saved')}>View all</button>}
          </div>
          {items.length ? (
            <ul className="mt-4 grid sm:grid-cols-2 gap-4">{items.slice(0, 4).map((i) => <AnalysisCard key={i.id} item={i} onOpen={onOpen} />)}</ul>
          ) : (
            <EmptyState title="No saved analyses yet" text="Run an analysis and press “Save to dashboard” on the results to keep it here." onNew={onNew} />
          )}
        </section>

        <aside className="space-y-5">
          <section className="card-solid p-6" aria-labelledby="active-h">
            <h2 id="active-h" className="eyebrow">Active plan</h2>
            {active ? (
              <>
                <div className="mt-4 flex items-center gap-4">
                  <div className="relative"><Ring pct={(active.doneCount / active.plan.days.length) * 100} size={64} /><span className="absolute inset-0 grid place-items-center text-xs font-bold">{active.doneCount}/14</span></div>
                  <div className="min-w-0"><p className="font-semibold line-clamp-2">{active.item.title}</p><p className="text-xs text-ink-3 mt-0.5">{active.plan.gaps.map((g) => g.name).join(' · ')}</p></div>
                </div>
                {active.next && (
                  <div className="mt-4 rounded-2xl bg-peach px-4 py-3">
                    <p className="eyebrow">Up next · Day {active.next.day}</p>
                    <p className="font-serif text-lg leading-snug mt-1">{active.next.title}</p>
                    <p className="text-xs text-ink-3 mt-1">{active.next.minutes} min</p>
                  </div>
                )}
                <button className="btn btn-line w-full justify-center mt-4" onClick={() => onOpen(active.item, true)}>Continue plan <Icon name="arrow" /></button>
              </>
            ) : (
              <p className="mt-3 text-sm text-ink-2">Save an analysis with gaps and its two-week plan will appear here with your progress.</p>
            )}
          </section>
          <section className="rounded-[1.25rem] bg-linear-to-br from-sage to-mist p-6">
            <h2 className="eyebrow text-ink-2!">How Alignly reads a JD</h2>
            <ul className="mt-3 space-y-2.5 text-sm text-ink-2">
              <li className="flex gap-2"><span className="chip chip-gap shrink-0">Required</span> “must”, “required”, “experience with”</li>
              <li className="flex gap-2"><span className="chip bg-rose text-ochre shrink-0">Preferred</span> “a plus”, “nice to have”, “bonus”</li>
              <li className="flex gap-2"><span className="chip chip-quiet shrink-0">Not needed</span> “no prior AWS experience needed”</li>
              <li className="flex gap-2"><span className="chip chip-match shrink-0">Either</span> “React or Vue”, “Java/Kotlin”</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

function SavedPage({ items, onOpen, onDelete, onNew }: { items: SavedAnalysis[]; onOpen: (i: SavedAnalysis, plan?: boolean) => void; onDelete: (id: string) => void; onNew: () => void }) {
  const [q, setQ] = useState('');
  const [confirm, setConfirm] = useState<string | null>(null);
  const shown = items.filter((i) => (i.title + ' ' + i.resumeName).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8 pt-8 rise">
      <PageHead kicker="Library" title="Saved analyses" sub="Each analysis is re-checked with the current engine when you open it." action={<button className="btn btn-ink" onClick={onNew}><Icon name="plus" /> New analysis</button>} />
      {items.length ? (
        <>
          <label className="mt-6 flex items-center gap-2 rounded-xl border rule bg-white px-3.5 max-w-md focus-within:border-ink-3">
            <Icon name="search" className="w-4 h-4 text-ink-3" />
            <span className="sr-only">Search saved analyses</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by role or resume name" className="flex-1 min-w-0 bg-transparent py-2.5 text-sm outline-none" />
          </label>
          <ul className="mt-6 space-y-3">
            {shown.map((i) => {
              const s = summarize(i);
              return (
                <li key={i.id} className="card-solid p-5 grid sm:grid-cols-[auto_1fr_auto] gap-4 items-center">
                  <div className="relative"><Ring pct={s.pct} size={52} /><span className="absolute inset-0 grid place-items-center text-[0.7rem] font-bold">{s.pct}%</span></div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{i.title}</p>
                    <p className="text-xs text-ink-3 mt-0.5">{fmtDate(i.createdAt)} · {i.resumeName} · {s.analysis.counts.matched} of {s.analysis.counts.counted} requirements shown</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="btn btn-line py-2! text-sm!" onClick={() => onOpen(i)}>Open</button>
                    {confirm === i.id ? (
                      <>
                        <button className="btn py-2! text-sm! bg-apricot text-ember" onClick={() => { onDelete(i.id); setConfirm(null); }}>Delete</button>
                        <button className="text-sm link" onClick={() => setConfirm(null)}>Cancel</button>
                      </>
                    ) : (
                      <button className="p-2 rounded-lg hover:bg-shell text-ink-3" aria-label={`Delete ${i.title}`} onClick={() => setConfirm(i.id)}><Icon name="trash" className="w-4 h-4" /></button>
                    )}
                  </div>
                </li>
              );
            })}
            {!shown.length && <li className="text-ink-3 text-sm">No saved analyses match “{q}”.</li>}
          </ul>
        </>
      ) : (
        <EmptyState title="Nothing saved yet" text="Run an analysis and press “Save to dashboard” on the results to keep it here." onNew={onNew} />
      )}
    </div>
  );
}

function PlansPage({ items, onOpen, onNew }: { items: SavedAnalysis[]; onOpen: (i: SavedAnalysis, plan?: boolean) => void; onNew: () => void }) {
  const sums = items.map((i) => ({ item: i, ...summarize(i) })).filter((s) => s.plan.days.length);
  const COLORS = ['bg-honey', 'bg-blush', 'bg-sage'];
  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8 pt-8 rise">
      <PageHead kicker="Two weeks at a time" title="Learning plans" sub="Every saved analysis with gaps comes with a 14-day plan. Tick off days inside the plan and your progress shows here." />
      {sums.length ? (
        <ul className="mt-8 grid md:grid-cols-2 gap-5">
          {sums.map((s) => (
            <li key={s.item.id} className="card-solid p-6 flex flex-col">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0"><p className="font-serif text-xl leading-snug line-clamp-2">{s.item.title}</p><p className="text-xs text-ink-3 mt-1">{fmtDate(s.item.createdAt)}</p></div>
                <div className="relative shrink-0"><Ring pct={(s.doneCount / s.plan.days.length) * 100} size={60} /><span className="absolute inset-0 grid place-items-center text-[0.7rem] font-bold">{s.doneCount}/14</span></div>
              </div>
              <div className="mt-4 grid grid-cols-14 gap-1" style={{ gridTemplateColumns: 'repeat(14, minmax(0, 1fr))' }} aria-hidden>
                {s.plan.days.map((d) => {
                  const gi = d.kind === 'learn' ? s.plan.gaps.findIndex((g) => g.key === d.gapKeys[0]) : -1;
                  return <span key={d.day} className={`h-6 rounded ${gi >= 0 ? COLORS[gi] : 'bg-sand'} ${d.day <= s.doneCount ? 'opacity-40' : ''}`} />;
                })}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">{s.plan.gaps.map((g, i) => <span key={g.key} className={`chip ${COLORS[i]} text-ink`}>{g.name}</span>)}</div>
              {s.next && <p className="mt-4 text-sm text-ink-2"><span className="font-semibold">Next:</span> Day {s.next.day} · {s.next.title}</p>}
              <button className="btn btn-ink mt-5 self-start py-2! text-sm!" onClick={() => onOpen(s.item, true)}>Open plan <Icon name="arrow" /></button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No plans yet" text="Plans appear here once you save an analysis that has gaps to close." onNew={onNew} />
      )}
    </div>
  );
}

function ProfilePage({ session, onSession, onSignOut, onDeleted, count }: { session: Session; onSession: (s: Session) => void; onSignOut: () => void; onDeleted: () => void; count: number }) {
  const acct = session.guest ? undefined : getAccount(session.userId);
  const [name, setName] = useState(acct?.name ?? session.name);
  const [college, setCollege] = useState(acct?.college ?? '');
  const [msg, setMsg] = useState('');
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="mx-auto max-w-3xl px-5 sm:px-8 pt-8 rise">
      <PageHead kicker="Account" title="Profile" />
      <section className="mt-6 card-solid p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <span className="grid place-items-center w-16 h-16 rounded-full bg-linear-to-br from-blush to-apricot font-serif text-2xl">{initials(session.name)}</span>
          <div><p className="font-serif text-2xl">{session.name}</p><p className="text-sm text-ink-3">{session.guest ? 'Guest session · create an account to keep your work' : session.email}</p></div>
        </div>
        {!session.guest && (
          <form className="mt-6 grid sm:grid-cols-2 gap-4" onSubmit={(e) => { e.preventDefault(); const s = updateProfile(session.userId, { name, college }); if (s) { onSession(s); setMsg('Profile saved.'); } }}>
            <label className="text-sm font-semibold">Full name<input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5 w-full rounded-xl border rule bg-white px-3.5 py-2.5 font-normal outline-none focus:border-ink-3" /></label>
            <label className="text-sm font-semibold">College<input value={college} onChange={(e) => setCollege(e.target.value)} className="mt-1.5 w-full rounded-xl border rule bg-white px-3.5 py-2.5 font-normal outline-none focus:border-ink-3" /></label>
            <div className="sm:col-span-2 flex items-center gap-3"><button className="btn btn-ink py-2!" type="submit">Save changes</button><span className="text-sm text-teal" aria-live="polite">{msg}</span></div>
          </form>
        )}
      </section>
      <section className="mt-5 rounded-[1.25rem] bg-linear-to-br from-sage to-mist p-6 sm:p-8">
        <p className="font-semibold flex items-center gap-2"><Icon name="lock" className="w-4 h-4" /> Your data</p>
        <p className="mt-2 text-sm text-ink-2">Your account and {count} saved analys{count === 1 ? 'is is' : 'es are'} stored only in this browser. Alignly has no account server, so clearing your browser data also removes them.</p>
      </section>
      <section className="mt-5 card-solid p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4">
        <div><p className="font-semibold">{session.guest ? 'End guest session' : 'Delete account'}</p><p className="text-sm text-ink-3">Removes {session.guest ? 'this guest’s' : 'your account and all'} saved analyses and plan progress from this browser.</p></div>
        <div className="flex gap-2">
          <button className="btn btn-line py-2!" onClick={onSignOut}><Icon name="logout" /> Sign out</button>
          {confirm
            ? <button className="btn py-2! bg-apricot text-ember" onClick={onDeleted}>Yes, delete everything</button>
            : <button className="btn py-2! text-ember hover:bg-apricot/50" onClick={() => setConfirm(true)}><Icon name="trash" /> Delete</button>}
        </div>
      </section>
    </div>
  );
}

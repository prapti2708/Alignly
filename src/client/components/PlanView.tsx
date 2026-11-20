import { useEffect, useMemo, useState } from 'react';
import type { Analysis } from '../../engine/analyze.ts';
import type { Plan, PlanDay } from '../../engine/plan.ts';
import { Icon } from './Icons.tsx';

const MARKS = ['◆', '●', '▲'];
// Each gap gets one calm palette colour: tile background, strong accent for dots and borders.
const GAP_STYLE = [
  { tile: 'bg-apricot', soft: 'bg-peach', dot: 'bg-honey', ring: 'border-honey' },
  { tile: 'bg-rose', soft: 'bg-petal', dot: 'bg-blush', ring: 'border-blush' },
  { tile: 'bg-sage', soft: 'bg-sage/50', dot: 'bg-[#9fbfae]', ring: 'border-[#9fbfae]' },
];
const PROJECT_STYLE = { tile: 'bg-sand', soft: 'bg-shell', dot: 'bg-ink-3', ring: 'border-ink-3' };
const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function useProgress(signature: string) {
  const storageKey = `alignly:plan:${signature}`;
  const [done, setDone] = useState<Record<number, boolean>>({});
  useEffect(() => {
    try { setDone(JSON.parse(localStorage.getItem(storageKey) ?? '{}')); } catch { setDone({}); }
  }, [storageKey]);
  const toggle = (d: number) => setDone((prev) => {
    const next = { ...prev, [d]: !prev[d] };
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* storage unavailable: keep in memory */ }
    return next;
  });
  return [done, toggle] as const;
}

export function PlanView({ plan, analysis, onEvidence }: { plan: Plan | null; analysis: Analysis; onEvidence: (key: string) => void }) {
  const signature = useMemo(() => (plan ? plan.gaps.map((g) => g.skillId).join('+') : 'none'), [plan]);
  const [done, toggle] = useProgress(signature);
  const nextDay = plan?.days.find((d) => !done[d.day])?.day ?? 1;
  const [open, setOpen] = useState<Record<number, boolean>>({});
  useEffect(() => setOpen({ [nextDay]: true }), [signature]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!plan || plan.mode === 'none') {
    const review = analysis.counts.review;
    return (
      <div className="mt-6 card-solid p-8 max-w-2xl relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-sage blur-2xl" aria-hidden />
        <p className="relative font-serif text-2xl flex items-center gap-3"><span className="grid place-items-center w-10 h-10 rounded-full bg-sage text-teal"><Icon name="matched" className="w-5 h-5" /></span> No verified gaps to plan for</p>
        <p className="relative mt-3 text-ink-2">Your resume shows evidence for every requirement we could verify in this JD.{review ? ` ${review} item${review > 1 ? 's need' : ' needs'} your review above; once you confirm them, the plan updates.` : ' Use the time to turn your strongest projects into clear resume bullets with results.'}</p>
      </div>
    );
  }

  const gapIndex = (key: string) => plan.gaps.findIndex((g) => g.key === key);
  const styleFor = (d: PlanDay) => (d.kind === 'learn' ? GAP_STYLE[gapIndex(d.gapKeys[0])] : PROJECT_STYLE);
  const markFor = (d: PlanDay) => (d.kind === 'learn' ? MARKS[gapIndex(d.gapKeys[0])] : '★');
  const doneCount = plan.days.filter((d) => done[d.day]).length;
  const range = (ds: number[]) => (ds.length ? `Days ${ds[0]}–${ds[ds.length - 1]}` : '');
  const pct = Math.round((doneCount / plan.days.length) * 100);

  const openDay = (n: number) => {
    setOpen((o) => ({ ...o, [n]: true }));
    requestAnimationFrame(() => {
      const el = document.getElementById(`day-${n}`);
      el?.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
      el?.querySelector<HTMLButtonElement>('button[data-toggle]')?.focus({ preventScroll: true });
    });
  };

  return (
    <div className="mt-4">
      <p className="text-ink-2 max-w-3xl">
        {plan.gaps.length === 1 ? 'One verified gap' : `The top ${plan.gaps.length} verified gaps`}, about 30–45 minutes a day ({Math.round(plan.totalMinutes / 60)} hours in total).{' '}
        {plan.mode === 'project' ? <>It ends with one small project: <em className="font-serif">{plan.projectTitle}</em>.</> : 'These skills don’t share one natural project, so each ends with its own practical checkpoint.'}
      </p>

      <ul className="mt-6 grid sm:grid-cols-3 gap-4" aria-label="Gaps covered by the plan">
        {plan.gaps.map((g, i) => {
          const item = analysis.items.find((x) => x.key === g.key);
          const learn = g.days.filter((d) => plan.days[d - 1].kind === 'learn');
          const st = GAP_STYLE[i];
          return (
            <li key={g.key} className={`rounded-2xl ${st.tile} p-5 lift relative overflow-hidden`}>
              <span className="absolute right-4 top-3 font-serif text-5xl text-white/70 select-none" aria-hidden>{i + 1}</span>
              <p className="eyebrow text-ink-2!"><span aria-hidden>{MARKS[i]} </span>Gap {item?.gapRank} · {item?.strength === 'preferred' ? 'Preferred' : 'Required'}</p>
              <p className="font-serif text-2xl mt-2">{g.name}</p>
              <p className="text-sm text-ink-2 mt-0.5">{range(learn)}{plan.mode === 'project' ? ' + project' : ' + checkpoint'}</p>
              <button className="mt-3 text-sm link font-semibold" onClick={() => onEvidence(g.key)}>See JD evidence (line {item?.jd.line})</button>
            </li>
          );
        })}
      </ul>

      {/* Compact two-week view */}
      <div className="mt-6 card-solid p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <h3 className="eyebrow">Two weeks at a glance</h3>
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10" aria-hidden>
              <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90"><circle cx="18" cy="18" r="15" fill="none" stroke="var(--color-mist)" strokeWidth="4" /><circle cx="18" cy="18" r="15" fill="none" stroke="#9fbfae" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(pct / 100) * 94.2} 94.2`} className="transition-[stroke-dasharray] duration-500" /></svg>
            </div>
            <p className="text-sm text-ink-2" aria-live="polite">{doneCount} of {plan.days.length} days done</p>
          </div>
        </div>
        {[0, 1].map((w) => (
          <div key={w} className="mt-4 grid grid-cols-[2.6rem_repeat(7,minmax(0,1fr))] sm:grid-cols-[4.2rem_repeat(7,minmax(0,1fr))] gap-1.5 sm:gap-2 items-stretch">
            <span className="text-[0.7rem] sm:text-xs text-ink-3 self-center font-semibold">Week {w + 1}</span>
            {plan.days.slice(w * 7, w * 7 + 7).map((d) => {
              const st = styleFor(d);
              return (
                <button key={d.day} onClick={() => openDay(d.day)}
                  aria-label={`Day ${d.day}: ${d.title}${done[d.day] ? ', done' : ''}`}
                  className={`relative text-left rounded-xl px-1.5 sm:px-2.5 py-2 min-h-[3.6rem] lg:min-h-[5.2rem] transition-all hover:-translate-y-0.5 hover:shadow-md ${st.tile} ${done[d.day] ? 'opacity-60' : ''}`}>
                  <span className="flex items-center justify-center sm:justify-between text-[0.72rem] font-semibold text-ink-2">
                    <span>{d.day}</span>
                    {done[d.day] ? <span className="grid place-items-center w-4 h-4 rounded-full bg-white text-teal"><Icon name="check" className="w-3 h-3" /></span> : <span className="hidden sm:inline text-ink-3" aria-hidden>{markFor(d)}</span>}
                  </span>
                  <span className="hidden lg:block text-[0.74rem] leading-snug mt-1 line-clamp-3 text-ink">{d.title}</span>
                </button>
              );
            })}
          </div>
        ))}
        <ul className="mt-4 flex flex-wrap gap-2 text-xs text-ink-2">
          {plan.gaps.map((g, i) => <li key={g.key} className={`chip ${GAP_STYLE[i].tile}`}><span aria-hidden>{MARKS[i]}</span> {g.name}</li>)}
          <li className="chip bg-sand"><span aria-hidden>★</span> {plan.mode === 'project' ? 'Project' : 'Checkpoint'}</li>
        </ul>
      </div>

      {/* Daily view */}
      <div className="mt-10 flex items-baseline justify-between">
        <h3 className="eyebrow">Day by day</h3>
        <div className="text-sm flex gap-4">
          <button className="link" onClick={() => setOpen(Object.fromEntries(plan.days.map((d) => [d.day, true])))}>Expand all</button>
          <button className="link" onClick={() => setOpen({})}>Collapse all</button>
        </div>
      </div>
      <ol className="mt-4 relative">
        <span className="absolute left-[1.05rem] top-3 bottom-3 w-px bg-rule" aria-hidden />
        {plan.days.map((d) => {
          const isOpen = !!open[d.day];
          const st = styleFor(d);
          const gapNames = d.gapKeys.map((k) => plan.gaps.find((g) => g.key === k)!);
          return (
            <li key={d.day} id={`day-${d.day}`} className="relative pl-12 pb-3 scroll-mt-24">
              <span className={`absolute left-0 top-3 grid place-items-center w-[2.15rem] h-[2.15rem] rounded-full border-2 border-white shadow-sm text-[0.72rem] font-bold ${done[d.day] ? 'bg-sage text-teal' : `${st.tile} text-ink`}`} aria-hidden>
                {done[d.day] ? '✓' : d.day}
              </span>
              <div className={`rounded-2xl border transition-all ${isOpen ? 'bg-white shadow-[var(--shadow-soft)] rule' : 'bg-white/50 border-transparent hover:bg-white/80'}`}>
                <div className="flex items-start gap-3 px-4 py-3">
                  <input type="checkbox" id={`done-${d.day}`} checked={!!done[d.day]} onChange={() => toggle(d.day)}
                    className="mt-1.5 w-[18px] h-[18px] rounded accent-[#3d6b59] cursor-pointer" aria-label={`Mark day ${d.day} done: ${d.title}`} />
                  <button data-toggle className="flex-1 text-left flex items-start gap-3 min-w-0" aria-expanded={isOpen} aria-controls={`day-body-${d.day}`} onClick={() => setOpen((o) => ({ ...o, [d.day]: !o[d.day] }))}>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[0.7rem] font-semibold text-ink-3 uppercase tracking-wider">Day {d.day}</span>
                      <span className={`block font-serif text-lg leading-snug ${done[d.day] ? 'line-through decoration-ink-3/50 text-ink-3' : ''}`}>{d.title}</span>
                      <span className="mt-1 flex flex-wrap gap-1.5">
                        <span className={`chip ${st.tile} text-ink-2`}><span aria-hidden>{markFor(d)}</span> {gapNames.map((g) => g.name).join(' + ')}</span>
                        <span className="chip chip-quiet">{d.minutes} min</span>
                        {d.kind !== 'learn' && <span className="chip bg-sand text-ink-2">{d.kind === 'project' ? 'Project' : 'Checkpoint'}</span>}
                      </span>
                    </span>
                    <Icon name={isOpen ? 'down' : 'chevron'} className="w-4 h-4 text-ink-3 mt-1.5" />
                  </button>
                </div>
                {isOpen && (
                  <div id={`day-body-${d.day}`} className="px-4 pb-5 pt-1 grid sm:grid-cols-3 gap-3 text-sm fade-in">
                    <div className="sm:col-span-3 rounded-xl bg-shell px-4 py-3"><p className="eyebrow">Task</p><p className="mt-1 text-ink">{d.task}</p></div>
                    <div className={`rounded-xl ${st.soft} px-4 py-3`}><p className="eyebrow">You’ll have</p><p className="mt-1 text-ink-2">{d.output}</p></div>
                    <div className="rounded-xl bg-mist/70 px-4 py-3"><p className="eyebrow">Self-check</p><p className="mt-1 text-ink-2">{d.selfCheck}</p></div>
                    <div className="rounded-xl bg-petal/70 px-4 py-3">
                      <p className="eyebrow">Why this day</p>
                      <p className="mt-1 text-ink-2">
                        {d.dependsOn.length ? `Builds on Day ${d.dependsOn.join(', ')}. ` : 'No prerequisites. '}
                        {gapNames.map((g, i) => (
                          <span key={g.key}>{i > 0 && ' · '}<button className="link" onClick={() => onEvidence(g.key)}>{g.name}: see JD evidence</button></span>
                        ))}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

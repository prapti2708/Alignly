import { useMemo, useState, type ReactNode } from 'react';
import type { Analysis } from '../../engine/analyze.ts';
import type { Plan } from '../../engine/plan.ts';
import type { ExtractResult, ExtractedPage } from '../api.ts';
import { EvidenceLens, buildRows } from './EvidenceLens.tsx';
import { PlanView } from './PlanView.tsx';
import { sourceLabel } from './Review.tsx';
import { Icon } from './Icons.tsx';

interface Props {
  analysis: Analysis;
  plan: Plan | null;
  jd: string;
  pages: ExtractedPage[];
  extraction: ExtractResult | null;
  onReview: () => void;
  onEditInputs: () => void;
  saved?: boolean;
  onSave?: () => void;
  guest?: boolean;
}

const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function SectionHeading({ id, kicker, title, children }: { id: string; kicker: string; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="eyebrow">{kicker}</p>
        <h2 id={id} className="font-serif text-[2rem] sm:text-[2.3rem] leading-tight mt-1">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export function Results({ analysis, plan, jd, pages, extraction, onReview, onEditInputs, saved, onSave, guest }: Props) {
  const rows = useMemo(() => buildRows(analysis), [analysis]);
  const [selected, setSelected] = useState<string | null>(rows[0]?.key ?? null);
  const c = analysis.counts;
  const requiredGaps = analysis.items.filter((i) => i.status === 'missing' && i.strength !== 'preferred').sort((a, b) => (a.gapRank ?? 0) - (b.gapRank ?? 0));
  const preferredGaps = analysis.items.filter((i) => i.status === 'missing' && i.strength === 'preferred');
  const jdTitle = jd.split('\n').map((l) => l.trim()).find(Boolean) ?? '';
  const sel = rows.some((r) => r.key === selected) ? selected : rows[0]?.key ?? null;
  const showStats = !analysis.extraction.blocked && c.counted > 0;
  const segs = [
    { n: c.matched, cls: 'bg-[#9fbfae]', label: 'Evidence found' },
    { n: requiredGaps.length, cls: 'bg-honey', label: 'Required gaps' },
    { n: preferredGaps.length, cls: 'bg-blush', label: 'Preferred gaps' },
  ];

  const showEvidence = (key: string) => {
    setSelected(key);
    requestAnimationFrame(() => {
      const target = window.innerWidth >= 768 ? document.getElementById('lens') : document.querySelector(`[data-row="${CSS.escape(key)}"]`);
      target?.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
      document.querySelector<HTMLButtonElement>(`[data-row="${CSS.escape(key)}"]`)?.focus({ preventScroll: true });
    });
  };
  const jumpToPlan = (key: string) => {
    const g = plan?.gaps.find((x) => x.key === key);
    const first = g?.days[0] ?? 1;
    const el = document.getElementById(`day-${first}`);
    el?.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
    el?.querySelector<HTMLButtonElement>('button[data-toggle]')?.focus({ preventScroll: true });
  };

  const sources = pages.map((p) => `p.${p.page}: ${sourceLabel(p).text.toLowerCase()}`).join(' · ');

  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8 pt-10">
      {/* Summary */}
      <section aria-labelledby="summary-h" className="card-solid relative overflow-hidden p-6 sm:p-10 rise">
        <div className="absolute -right-24 -top-24 w-80 h-80 rounded-full bg-peach blur-2xl opacity-80 pointer-events-none" aria-hidden />
        <div className="absolute right-24 -bottom-28 w-64 h-64 rounded-full bg-sage blur-2xl opacity-70 pointer-events-none" aria-hidden />
        <div className="relative">
          <p className="eyebrow truncate">Results{jdTitle ? ` · ${jdTitle}` : ''}</p>
          <h1 id="summary-h" className="font-serif text-[2rem] sm:text-[2.9rem] leading-[1.08] mt-3 max-w-3xl text-balance">{analysis.summary}</h1>
          {showStats && <p className="mt-3 text-ink-2 max-w-3xl text-[0.95rem]">{analysis.denominator}</p>}

          {analysis.extraction.message && (
            <div role="status" className={`mt-5 max-w-3xl rounded-2xl px-5 py-4 text-sm border ${analysis.extraction.blocked || analysis.extraction.unreadablePages.length ? 'bg-apricot/60 border-honey' : 'bg-petal border-rose'}`}>
              <p className="flex gap-2"><Icon name="alert" className="w-4 h-4 mt-0.5 text-ember" /> {analysis.extraction.message}</p>
              <button className="link mt-1 ml-6 font-semibold" onClick={onReview}>Review extracted text</button>
            </div>
          )}

          {showStats && (
            <>
              {/* Composition of the requirements, proportional */}
              <div className="mt-7">
                <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-mist" aria-hidden>
                  {segs.filter((s) => s.n).map((s) => (
                    <span key={s.label} className={`${s.cls} h-full transition-[width] duration-700 border-r-2 border-white last:border-r-0`} style={{ width: `${(s.n / c.counted) * 100}%` }} />
                  ))}
                </div>
                <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-2">
                  {segs.map((s) => (
                    <li key={s.label} className="flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-full ${s.cls}`} aria-hidden /> {s.label}: {s.n}</li>
                  ))}
                </ul>
              </div>

              <dl className="mt-7 grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                <div className="rounded-2xl bg-sage/60 px-4 py-3"><dt className="text-ink-2">Required</dt><dd className="mt-0.5"><span className="font-serif text-2xl">{c.requiredMatched}</span> of {c.required} shown</dd></div>
                <div className="rounded-2xl bg-peach px-4 py-3"><dt className="text-ink-2">Preferred</dt><dd className="mt-0.5"><span className="font-serif text-2xl">{c.preferredMatched}</span> of {c.preferred} shown</dd></div>
                <div className="rounded-2xl bg-petal px-4 py-3"><dt className="text-ink-2">Needs review</dt><dd className="mt-0.5"><span className="font-serif text-2xl">{c.review}</span> not counted</dd></div>
                <div className="rounded-2xl bg-mist/80 px-4 py-3"><dt className="text-ink-2">Not needed</dt><dd className="mt-1.5">{analysis.notRequired.length ? analysis.notRequired.map((n) => n.name).join(', ') : '—'}</dd></div>
              </dl>
            </>
          )}

          {requiredGaps.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center gap-2 text-[0.95rem]">
              <span className="font-semibold text-ember mr-1">Required gaps:</span>
              {requiredGaps.map((g) => (
                <button key={g.key} className="chip chip-gap text-[0.85rem]! px-3! py-1! lift" onClick={() => showEvidence(g.key)}>{g.canonical} <Icon name="arrow" className="w-3.5 h-3.5" /></button>
              ))}
              {preferredGaps.length > 0 && <span className="text-ink-3 text-sm ml-1">plus {preferredGaps.length} preferred</span>}
            </div>
          )}

          <div className="mt-6 pt-5 border-t rule flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
            {onSave && (saved
              ? <span className="chip chip-match text-sm! px-3! py-1.5!"><Icon name="check" className="w-3.5 h-3.5" /> Saved to your dashboard</span>
              : <button className="btn btn-ink py-2! text-sm!" onClick={onSave} title={guest ? 'Saved for this guest session in this browser' : undefined}><Icon name="file" className="w-4 h-4" /> Save to dashboard</button>)}
            <button className="link inline-flex items-center gap-1.5" onClick={onReview}><Icon name="edit" className="w-3.5 h-3.5" /> Review extracted text</button>
            <button className="link inline-flex items-center gap-1.5" onClick={onEditInputs}><Icon name="back" className="w-3.5 h-3.5" /> Change resume or JD</button>
            <span className="text-ink-3 text-xs self-center">Read from {sources}</span>
          </div>
        </div>
      </section>

      {/* Evidence Lens */}
      <section id="lens" aria-labelledby="lens-h" className="mt-16 scroll-mt-20">
        <SectionHeading id="lens-h" kicker="Line by line" title="Evidence Lens">
          <p className="text-sm text-ink-3 flex items-center gap-2"><kbd className="px-1.5 py-0.5 rounded-md bg-white border rule text-xs">↑</kbd><kbd className="px-1.5 py-0.5 rounded-md bg-white border rule text-xs">↓</kbd> Select a skill to see the exact JD line and resume excerpt.</p>
        </SectionHeading>
        <EvidenceLens analysis={analysis} rows={rows} jd={jd} pages={pages} previews={extraction?.previews ?? []} plan={plan} selected={sel} onSelect={setSelected} onJumpToPlan={jumpToPlan} />
      </section>

      {/* Plan */}
      {!analysis.extraction.blocked && (
        <section id="plan" aria-labelledby="plan-h" className="mt-20 scroll-mt-20">
          <SectionHeading id="plan-h" kicker="Fourteen calm days" title="Your two-week plan" />
          <PlanView plan={plan} analysis={analysis} onEvidence={showEvidence} />
        </section>
      )}
    </div>
  );
}

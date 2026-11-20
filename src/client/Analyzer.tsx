import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { analyze } from '../engine/analyze.ts';
import { buildPlan } from '../engine/plan.ts';
import { extract, type ExtractResult, type ExtractedPage } from './api.ts';
import { InputScreen, type ResumeInput } from './components/InputScreen.tsx';
import { Working } from './components/Working.tsx';
import { Review } from './components/Review.tsx';
import { Results } from './components/Results.tsx';
import { STATIC } from './mode.ts';
import { saveAnalysis, type SavedAnalysis } from './saved.ts';
import type { Session } from './auth.ts';

type Screen = 'input' | 'working' | 'review' | 'results';
export interface ProgressState { pct: number; message: string; log: string[]; error?: string }

interface Props {
  session: Session;
  /** A saved analysis to reopen (re-analysed from its saved text). */
  open?: SavedAnalysis | null;
  autoSample?: boolean;
  focusPlan?: boolean;
  onSaved: (s: SavedAnalysis) => void;
}

const resumeLabel = (r: ResumeInput | null) => (r?.kind === 'pdf' ? r.name : r?.kind === 'extracted' ? r.name : 'Pasted resume text');

export function Analyzer({ session, open, autoSample, focusPlan, onSaved }: Props) {
  const [screen, setScreen] = useState<Screen>(open ? 'results' : 'input');
  const [resume, setResume] = useState<ResumeInput | null>(null);
  const [jd, setJd] = useState(open?.jd ?? '');
  const [extraction, setExtraction] = useState<ExtractResult | null>(null);
  const [pages, setPages] = useState<ExtractedPage[]>(open?.pages ?? []);
  const [progress, setProgress] = useState<ProgressState>({ pct: 0, message: '', log: [] });
  const [announce, setAnnounce] = useState('');
  const [savedId, setSavedId] = useState<string | null>(open?.id ?? null);
  const [resumeName, setResumeName] = useState(open?.resumeName ?? '');
  const topRef = useRef<HTMLDivElement>(null);

  const analysis = useMemo(() => (pages.length && jd.trim() ? analyze(jd, pages) : null), [jd, pages]);
  const plan = useMemo(() => (analysis && !analysis.extraction.blocked ? buildPlan(analysis.topGaps) : null), [analysis]);

  const go = useCallback((s: Screen) => {
    setScreen(s);
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0 });
      topRef.current?.focus({ preventScroll: true });
    });
  }, []);

  useEffect(() => {
    if (open && focusPlan) requestAnimationFrame(() => document.getElementById('plan')?.scrollIntoView({ block: 'start' }));
  }, [open, focusPlan]);

  // Revoke the object URL of the original PDF when it is replaced.
  useEffect(() => () => { if (resume?.kind === 'pdf') URL.revokeObjectURL(resume.url); }, [resume]);

  const run = useCallback(async (r: ResumeInput, jdText: string) => {
    setJd(jdText);
    setSavedId(null);
    setResumeName(resumeLabel(r));
    if (r.kind === 'extracted') {
      setExtraction(r.result);
      setPages(r.result.pages);
      go('results');
      return;
    }
    if (r.kind === 'text') {
      setExtraction(null);
      setPages([{ page: 1, text: r.text, source: 'edited', confidence: 100, lines: [], width: 0, height: 0 }]);
      go('results');
      return;
    }
    setProgress({ pct: 1, message: 'Uploading your PDF', log: [] });
    go('working');
    try {
      const result = await extract(r.bytes, (p) =>
        setProgress((prev) => ({ pct: p.pct, message: p.message, log: prev.log[prev.log.length - 1] === p.message ? prev.log : [...prev.log, p.message] })),
      );
      setExtraction(result);
      setPages(result.pages);
      const a = analyze(jdText, result.pages);
      // If any page is unreadable, send the student to fix it before showing gaps.
      go(a.extraction.blocked || a.extraction.unreadablePages.length ? 'review' : 'results');
    } catch (e) {
      setProgress((p) => ({ ...p, error: (e as Error).message }));
    }
  }, [go]);

  const applyEdits = useCallback((next: ExtractedPage[]) => {
    setPages(next);
    setSavedId(null);
    setAnnounce('Analysis updated with your corrected text. Evidence, counts and the plan have been recalculated.');
    go('results');
  }, [go]);

  const save = () => {
    const s = saveAnalysis(session.userId, { jd, pages, resumeName: resumeName || 'Resume' });
    setSavedId(s.id);
    setAnnounce('Saved to your dashboard.');
    onSaved(s);
  };

  const steps = [
    { id: 'input', label: 'Upload', active: screen === 'input' || screen === 'working' },
    { id: 'review', label: 'Review text', active: screen === 'review' },
    { id: 'results', label: 'Evidence & plan', active: screen === 'results' },
  ];
  const activeIdx = steps.findIndex((s) => s.active);

  return (
    <div ref={topRef} tabIndex={-1} className="outline-none pb-10">
      <p className="sr-only" aria-live="polite">{announce}</p>
      <div className="mx-auto max-w-6xl px-5 sm:px-8 pt-6">
        <nav aria-label="Analysis steps" className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-white/70 border rule p-1 shadow-sm">
          {steps.map((st, i) => (
            <span key={st.id} className="flex items-center gap-1.5 sm:gap-2" aria-current={st.active ? 'step' : undefined}>
              {i > 0 && <span className={`w-4 sm:w-6 h-px ${i <= activeIdx ? 'bg-ink-3' : 'bg-rule'}`} aria-hidden />}
              <span className={`flex items-center gap-2 rounded-full pl-1 pr-2 sm:pr-3 py-1 text-xs font-semibold transition-colors ${st.active ? 'bg-ink text-white' : 'text-ink-3'}`}>
                <span className={`grid place-items-center w-5 h-5 rounded-full text-[0.65rem] ${st.active ? 'bg-white/20 text-white' : i < activeIdx ? 'bg-sage text-teal' : 'bg-mist text-ink-3'}`}>{i < activeIdx ? '✓' : i + 1}</span>
                <span className={st.active ? '' : 'hidden sm:inline'}>{st.label}</span>
              </span>
            </span>
          ))}
        </nav>
      </div>

      {screen === 'input' && (
        <InputScreen initialResume={resume} initialJd={jd} onResume={setResume} onSubmit={run} autoSample={autoSample} />
      )}
      {screen === 'working' && (
        <Working progress={progress} onBack={() => go('input')} onPasteInstead={() => { setResume({ kind: 'text', text: '' }); go('input'); }} />
      )}
      {screen === 'review' && analysis && (
        <Review
          pages={pages}
          extraction={extraction}
          pdf={resume?.kind === 'pdf' ? resume : null}
          analysis={analysis}
          onApply={applyEdits}
          onCancel={() => go(analysis.extraction.blocked ? 'input' : 'results')}
          retry={STATIC ? undefined : (page, opts) => (resume?.kind === 'pdf' ? extract(resume.bytes, () => {}, { page, ocr: true, ...opts }) : Promise.reject(new Error('No PDF to retry.')))}
        />
      )}
      {screen === 'results' && analysis && (
        <Results
          analysis={analysis}
          plan={plan}
          jd={jd}
          pages={pages}
          extraction={extraction}
          onReview={() => go('review')}
          onEditInputs={() => go('input')}
          saved={!!savedId}
          onSave={analysis.extraction.blocked ? undefined : save}
          guest={!!session.guest}
        />
      )}
    </div>
  );
}

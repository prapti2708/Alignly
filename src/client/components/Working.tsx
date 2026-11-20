import type { ProgressState } from '../Analyzer.tsx';
import { Icon } from './Icons.tsx';
import { STATIC } from '../mode.ts';

export function Working({ progress, onBack, onPasteInstead }: { progress: ProgressState; onBack: () => void; onPasteInstead: () => void }) {
  const done = progress.log.slice(0, -1);
  return (
    <div className="mx-auto max-w-3xl px-5 sm:px-8 pt-14">
      <div className="card-solid p-7 sm:p-10 rise">
        {!progress.error ? (
          <div className="grid sm:grid-cols-[9rem_1fr] gap-8 items-start">
            {/* Paper being read */}
            <div className="mx-auto w-32 h-40 rounded-xl bg-white border rule shadow-sm p-3.5 scan" aria-hidden>
              <span className="block h-2.5 w-16 rounded bg-ink/70" />
              <span className="block h-1.5 w-20 rounded bg-rule mt-2" />
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[0, 1].map((c) => (
                  <div key={c} className="space-y-1.5">
                    {[10, 14, 12, 9, 13, 11].map((w, i) => (
                      <span key={i} className={`block h-1.5 rounded ${i === 1 && c === 1 ? 'bg-honey' : i === 3 && c === 0 ? 'bg-sage' : 'bg-mist'}`} style={{ width: `${w * 4}px` }} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="eyebrow">Reading your resume</p>
              <h1 className="font-serif text-[1.9rem] leading-tight mt-2" aria-live="polite">{progress.message || 'Starting…'}</h1>
              <div className="mt-5 h-2 bg-mist rounded-full overflow-hidden" role="progressbar" aria-label="Extraction progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.pct}>
                <div className="h-full rounded-full bg-linear-to-r from-blush via-honey to-sage transition-[width] duration-500" style={{ width: `${Math.max(4, progress.pct)}%` }} />
              </div>
              <ol className="mt-5 space-y-2 text-sm text-ink-2">
                {done.map((m, i) => (
                  <li key={i} className="flex items-center gap-2.5 fade-in">
                    <span className="grid place-items-center w-5 h-5 rounded-full bg-sage text-teal"><Icon name="check" className="w-3 h-3" /></span> {m}
                  </li>
                ))}
              </ol>
              <p className="mt-6 text-sm text-ink-3">
                {STATIC
                  ? 'We read the text layer of each page inside your browser and recover columns and table rows from text positions. Nothing is uploaded.'
                  : 'We read the text layer of each page, recover columns and table rows from text positions, and run OCR only on pages (or scanned sections) without usable text. Scanned pages can take up to half a minute.'}
              </p>
            </div>
          </div>
        ) : (
          <div role="alert">
            <span className="grid place-items-center w-12 h-12 rounded-2xl bg-apricot text-ember"><Icon name="alert" className="w-6 h-6" /></span>
            <h1 className="font-serif text-3xl mt-4">We couldn’t read this PDF</h1>
            <p className="mt-3 text-ink-2">{progress.error}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button className="btn btn-ink" onClick={onBack}><Icon name="back" /> Choose another file</button>
              <button className="btn btn-line" onClick={onPasteInstead}>Paste resume text instead</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

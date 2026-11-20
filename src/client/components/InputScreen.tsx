declare const __STATIC__: boolean | undefined;
import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from './Icons.tsx';
import { STATIC } from '../mode.ts';
import type { ExtractResult } from '../api.ts';

export type ResumeInput =
  | { kind: 'pdf'; name: string; size: number; bytes: ArrayBuffer; url: string }
  | { kind: 'text'; text: string }
  /** Already-read sample used by the browser-only build (no PDF is shipped). */
  | { kind: 'extracted'; name: string; result: ExtractResult };

interface Props {
  initialResume: ResumeInput | null;
  initialJd: string;
  onResume: (r: ResumeInput | null) => void;
  onSubmit: (r: ResumeInput, jd: string) => void;
  autoSample?: boolean;
}

const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export function InputScreen({ initialResume, initialJd, onResume, onSubmit, autoSample }: Props) {
  const [resume, setResumeState] = useState<ResumeInput | null>(initialResume);
  const [jd, setJd] = useState(initialJd);
  const [pasteMode, setPasteMode] = useState(initialResume?.kind === 'text');
  const [pasted, setPasted] = useState(initialResume?.kind === 'text' ? initialResume.text : '');
  const [error, setError] = useState('');
  const [drag, setDrag] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const jdFileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const ids = { resume: useId(), jd: useId(), jdHelp: useId(), err: useId() };

  const setResume = (r: ResumeInput | null) => { setResumeState(r); onResume(r); };

  async function takeFile(f: File | undefined) {
    setError('');
    if (!f) return;
    const isPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) return setError('Please choose a PDF file. Word documents can be saved as PDF with File → Save as → PDF.');
    if (f.size > 10 * 1024 * 1024) return setError('This PDF is larger than 10 MB. Export a smaller copy and try again.');
    const bytes = await f.arrayBuffer();
    setResume({ kind: 'pdf', name: f.name, size: f.size, bytes, url: URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })) });
  }

  async function takeJdFile(f: File | undefined) {
    if (!f) return;
    if (!/\.txt$/i.test(f.name) && f.type !== 'text/plain') return setError('Upload the job description as a .txt file, or paste it.');
    setJd(await f.text());
  }

  async function trySample() {
    setError('');
    setLoadingSample(true);
    try {
      if (typeof __STATIC__ !== 'undefined' && __STATIC__) {
        const [data, jdMod] = await Promise.all([import('../sample-static.json'), import('../../../public/samples/sample-jd.txt')]);
        const sample = (data as any).default ?? data;
        const jdText: string = (jdMod as any).default;
        const r: ResumeInput = { kind: 'extracted', name: sample.name, result: sample };
        setJd(jdText);
        onSubmit(r, jdText);
        return;
      }
      const [pdf, text] = await Promise.all([fetch('/samples/sample-resume.pdf'), fetch('/samples/sample-jd.txt')]);
      if (!pdf.ok || !text.ok) throw new Error();
      const bytes = await pdf.arrayBuffer();
      const r: ResumeInput = { kind: 'pdf', name: 'sample-resume.pdf', size: bytes.byteLength, bytes, url: URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })) };
      const jdText = await text.text();
      setResume(r);
      setPasteMode(false);
      setJd(jdText);
      onSubmit(r, jdText);
    } catch {
      setError('The sample files could not be loaded. Check that the server is running.');
    } finally {
      setLoadingSample(false);
    }
  }

  const effective: ResumeInput | null = pasteMode ? (pasted.trim() ? { kind: 'text', text: pasted } : null) : resume?.kind === 'pdf' ? resume : null;
  const ready = !!effective && jd.trim().length > 0;
  const started = useRef(false);
  useEffect(() => {
    if (autoSample && !started.current) { started.current = true; trySample(); }
  }, [autoSample]); // eslint-disable-line react-hooks/exhaustive-deps
  const jdLines = jd ? jd.split('\n').length : 0;

  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8">
      <div ref={formRef} className="pt-8 rise">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="eyebrow">New analysis</p>
            <h1 className="font-serif text-[2.1rem] sm:text-[2.6rem] leading-tight mt-1">Two inputs, one honest comparison</h1>
            <p className="mt-2 text-ink-2 max-w-2xl">Add your resume and the job description. Every result will point to the exact JD line and the place in your resume it came from.</p>
          </div>
          <button className="btn btn-soft" onClick={trySample} disabled={loadingSample}>
            <Icon name="spark" /> {loadingSample ? 'Loading sample…' : 'Try a sample'}
          </button>
        </div>
        <div className="mt-6 grid md:grid-cols-2 gap-5">
          {/* Step 1 */}
          <section aria-labelledby={ids.resume} className="card-solid p-6 sm:p-7 flex flex-col">
            <div className="flex items-center gap-3">
              <span className="grid place-items-center w-8 h-8 rounded-full bg-blush font-serif text-ink" aria-hidden>1</span>
              <div>
                <p className="eyebrow">Step 1</p>
                <h2 id={ids.resume} className="font-serif text-2xl leading-tight">Your resume</h2>
              </div>
            </div>
            {!pasteMode ? (
              <>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={(e) => { e.preventDefault(); setDrag(false); takeFile(e.dataTransfer.files[0]); }}
                  className={`mt-5 flex-1 rounded-2xl border-2 border-dashed px-5 py-9 text-center transition-all dropzone ${drag ? 'border-ember bg-peach scale-[1.01]' : 'border-blush bg-petal/40'}`}
                >
                  {resume?.kind === 'pdf' ? (
                    <div className="flex flex-col items-center gap-2 fade-in">
                      <span className="grid place-items-center w-12 h-12 rounded-2xl bg-white shadow-sm text-ember"><Icon name="file" className="w-6 h-6" /></span>
                      <p className="font-semibold break-all mt-1">{resume.name}</p>
                      <p className="text-sm text-ink-3">{kb(resume.size)} · PDF · ready</p>
                      <div className="flex gap-4 text-sm mt-1">
                        {!STATIC && <a className="link" href={resume.url} target="_blank" rel="noreferrer">Preview original</a>}
                        <button className="link" onClick={() => fileRef.current?.click()}>Replace</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <span className="grid place-items-center w-12 h-12 rounded-2xl bg-white shadow-sm text-ink-2"><Icon name="upload" className="w-6 h-6" /></span>
                      <p className="text-ink-2">Drag your resume PDF here, or</p>
                      <button className="btn btn-ink" onClick={() => fileRef.current?.click()}>Choose PDF</button>
                      <p className="text-xs text-ink-3 max-w-xs">{STATIC ? 'Two-column layouts and tables are fine. Scanned pages: you’ll be asked to paste their text. Up to 10 MB.' : 'Two-column layouts, tables and scanned pages are fine. Up to 10 MB.'}</p>
                    </div>
                  )}
                  <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="sr-only" aria-label="Choose resume PDF" onChange={(e) => takeFile(e.target.files?.[0])} />
                </div>
                <button className="mt-4 self-start text-sm link text-ink-2" onClick={() => setPasteMode(true)}>No PDF? Paste your resume text instead</button>
              </>
            ) : (
              <>
                <label htmlFor="resume-text" className="block mt-5 text-sm text-ink-2">Paste the full text of your resume, including projects and internships.</label>
                <textarea id="resume-text" value={pasted} onChange={(e) => setPasted(e.target.value)} rows={12}
                  className="mt-2 w-full flex-1 rounded-2xl border rule bg-paper p-4 font-mono text-sm leading-relaxed focus:border-ink-3 focus:bg-white transition-colors" />
                <button className="mt-4 self-start text-sm link text-ink-2" onClick={() => setPasteMode(false)}>Upload a PDF instead</button>
              </>
            )}
          </section>

          {/* Step 2 */}
          <section aria-labelledby={ids.jd} className="card-solid p-6 sm:p-7 flex flex-col">
            <div className="flex items-center gap-3">
              <span className="grid place-items-center w-8 h-8 rounded-full bg-sage font-serif text-ink" aria-hidden>2</span>
              <div>
                <p className="eyebrow">Step 2</p>
                <h2 id={ids.jd} className="font-serif text-2xl leading-tight">The job description</h2>
              </div>
            </div>
            <label htmlFor="jd-text" className="sr-only">Job description text</label>
            <textarea id="jd-text" value={jd} onChange={(e) => setJd(e.target.value)} rows={12} aria-describedby={ids.jdHelp}
              placeholder={'Paste the JD exactly as posted, for example:\n\nRequirements:\n• Experience with React.js or Vue is required.\n• Docker is required for packaging services.'}
              className="mt-5 w-full flex-1 rounded-2xl border rule bg-paper p-4 text-sm leading-relaxed focus:border-ink-3 focus:bg-white transition-colors placeholder:text-ink-3/70" />
            <div id={ids.jdHelp} className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-ink-3">
              <span>{jdLines ? `${jdLines} lines kept exactly as written` : 'Line breaks are kept, so evidence can point to exact lines.'}</span>
              <button className="link text-ink-2 inline-flex items-center gap-1" onClick={() => jdFileRef.current?.click()}><Icon name="upload" className="w-3.5 h-3.5" /> Upload .txt</button>
              <input ref={jdFileRef} type="file" accept=".txt,text/plain" className="sr-only" aria-label="Upload job description text file" onChange={(e) => takeJdFile(e.target.files?.[0])} />
            </div>
          </section>
        </div>

        <div className="mt-5 card px-5 sm:px-7 py-4 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <p className="text-sm text-ink-2 max-w-xl flex items-start gap-2.5">
            <span className="grid place-items-center w-6 h-6 rounded-full bg-sage text-teal shrink-0 mt-0.5" aria-hidden>
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
            </span>
            {STATIC
              ? 'Everything runs inside your browser: your PDF is never uploaded or saved anywhere.'
              : 'Your PDF is read on this server for this request only and is never saved. The comparison and plan are computed in your browser.'}
          </p>
          <div className="flex flex-col items-start sm:items-end gap-1">
            <button className="btn btn-ink" disabled={!ready} onClick={() => effective && onSubmit(effective, jd)}>
              Analyse resume <Icon name="arrow" />
            </button>
            {!ready && <p className="text-xs text-ink-3">{!effective ? 'Add your resume' : 'Add the job description'} to continue.</p>}
          </div>
        </div>
        {error && <p id={ids.err} role="alert" className="mt-4 text-ember text-sm flex gap-2"><Icon name="alert" /> {error}</p>}
      </div>
    </div>
  );
}

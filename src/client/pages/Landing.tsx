import { useState } from 'react';
import { Icon } from '../components/Icons.tsx';
import { HeroPreview } from '../components/HeroPreview.tsx';
import { Logo } from '../components/Logo.tsx';
import { STATIC } from '../mode.ts';
import type { Session } from '../auth.ts';

interface Props {
  session: Session | null;
  onSignIn: () => void;
  onRegister: () => void;
  onDemo: () => void;
  onDashboard: () => void;
}

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });

const STEPS = [
  { n: '01', title: 'Upload', text: 'Add your resume PDF and paste the job description exactly as posted.', bg: 'bg-blush' },
  { n: '02', title: 'Review', text: 'Check the text we read: columns, tables and icons are already sorted out.', bg: 'bg-apricot' },
  { n: '03', title: 'See the evidence', text: 'Every skill links to its JD line and the place in your resume that proves it.', bg: 'bg-sage' },
  { n: '04', title: 'Close the gaps', text: 'Follow a 14-day plan for your top three gaps, 30–45 minutes a day.', bg: 'bg-rose' },
];

const FAQ = [
  ['Is my resume uploaded anywhere?', STATIC
    ? 'No. This version reads your PDF and runs the whole analysis inside your browser. Nothing is sent to a server.'
    : 'Your PDF is read on the Alignly server for that request only and deleted straight after. The comparison and plan run in your browser.'],
  ['How is this different from a keyword checker?', 'Alignly understands how JDs are written: required versus preferred, “no AWS experience needed”, and “React or Vue”. It treats ReactJS and React.js as the same skill but keeps C, C++ and C# apart, and it quotes the exact line behind every verdict.'],
  ['What if it gets something wrong?', 'You can review and correct the extracted text at any time. Unclear items go to “Needs review” instead of being guessed, and pages it can’t read are never counted as missing skills.'],
  ['Where are accounts and saved analyses stored?', 'In this browser only. Passwords are stored as salted hashes, never in plain text. You can delete everything from your profile.'],
  ['Does a gap mean I can’t do it?', 'No. A gap only means your resume shows no evidence for it yet. If you’ve used the skill, add it where you used it and run the analysis again.'],
];

const COMPARE: [string, boolean, boolean][] = [
  ['Quotes the exact JD line for every skill', false, true],
  ['Shows where your resume proves it', false, true],
  ['Separates required, preferred and “not needed”', false, true],
  ['Understands alternatives like “React or Vue”', false, true],
  ['Reads two-column and table layouts', false, true],
  ['Turns gaps into a day-by-day plan', false, true],
];

export function Landing({ session, onSignIn, onRegister, onDemo, onDashboard }: Props) {
  const [faq, setFaq] = useState<number | null>(0);
  return (
    <div className="relative">
      {/* Top navigation */}
      <header className="sticky top-0 z-30 border-b rule bg-paper/70 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
          <Logo sub={false} onClick={() => window.scrollTo({ top: 0 })} />
          <nav aria-label="Sections" className="hidden md:flex items-center gap-7 text-sm text-ink-2">
            <button className="hover:text-ink" onClick={() => scrollTo('how')}>How it works</button>
            <button className="hover:text-ink" onClick={() => scrollTo('features')}>Features</button>
            <button className="hover:text-ink" onClick={() => scrollTo('privacy')}>Privacy</button>
            <button className="hover:text-ink" onClick={() => scrollTo('faq')}>FAQ</button>
          </nav>
          <div className="flex items-center gap-2">
            {session ? (
              <button className="btn btn-ink py-2!" onClick={onDashboard}>Open dashboard <Icon name="arrow" /></button>
            ) : (
              <>
                <button className="btn py-2! text-ink hover:bg-white/70" onClick={onSignIn}>Sign in</button>
                <button className="btn btn-ink py-2!" onClick={onRegister}>Get started</button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 sm:px-8 pt-12 sm:pt-20 grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-10 items-center">
        <div className="rise">
          <span className="chip bg-white/70 border rule text-ink-2"><span className="w-1.5 h-1.5 rounded-full bg-teal" /> Resume ↔ job description, aligned</span>
          <h1 className="font-serif text-[2.6rem] sm:text-[3.7rem] leading-[1.03] mt-5 text-balance">
            Know what your resume <em className="italic text-ember">proves</em>, before the recruiter does.
          </h1>
          <p className="mt-5 text-ink-2 text-[1.08rem] max-w-xl">
            Alignly reads your resume the way a careful recruiter would. It finds every skill a job asks for, quotes the line, shows your evidence, and turns what’s missing into a calm two-week plan.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button className="btn btn-ink" onClick={session ? onDashboard : onRegister}>{session ? 'Go to dashboard' : 'Create free account'} <Icon name="arrow" /></button>
            <button className="btn btn-line" onClick={onDemo}><Icon name="spark" /> Try the live demo</button>
          </div>
          <p className="mt-4 text-sm text-ink-3 flex items-center gap-2"><Icon name="lock" className="w-4 h-4" /> No upload needed for the demo. Accounts stay in your browser.</p>
        </div>
        <HeroPreview />
      </section>

      {/* Formats strip */}
      <section aria-label="What Alignly can read" className="mx-auto max-w-6xl px-5 sm:px-8 mt-14">
        <div className="card px-6 py-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-ink-2">
          <span className="eyebrow">Reads</span>
          {['Two-column resumes', 'Skills tables', 'Icon-heavy templates', STATIC ? 'Pasted text' : 'Scanned pages (OCR)', 'Any pasted JD'].map((t) => (
            <span key={t} className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-honey" aria-hidden /> {t}</span>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-5 sm:px-8 mt-24 scroll-mt-20">
        <p className="eyebrow">How it works</p>
        <h2 className="font-serif text-[2.2rem] sm:text-[2.8rem] leading-tight mt-2 max-w-2xl">From “am I a fit?” to a plan, in four calm steps.</h2>
        <ol className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
          <span className="hidden lg:block absolute left-8 right-8 top-[2.1rem] h-px bg-rule" aria-hidden />
          {STEPS.map((s) => (
            <li key={s.n} className="relative card-solid p-6 lift">
              <span className={`grid place-items-center w-11 h-11 rounded-2xl ${s.bg} font-serif text-lg relative`}>{s.n}</span>
              <p className="mt-5 font-semibold text-lg">{s.title}</p>
              <p className="mt-1.5 text-sm text-ink-2">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Bento features */}
      <section id="features" className="mx-auto max-w-6xl px-5 sm:px-8 mt-24 scroll-mt-20">
        <p className="eyebrow">Features</p>
        <h2 className="font-serif text-[2.2rem] sm:text-[2.8rem] leading-tight mt-2 max-w-2xl">Every verdict comes with its receipts.</h2>
        <div className="mt-10 grid md:grid-cols-6 gap-4">
          {/* Evidence Lens */}
          <div className="md:col-span-4 card-solid p-7 relative overflow-hidden">
            <div className="absolute -right-20 -bottom-24 w-72 h-72 rounded-full bg-sage blur-2xl opacity-70" aria-hidden />
            <p className="eyebrow">Evidence Lens</p>
            <p className="font-serif text-2xl mt-2 max-w-md">See the JD line and your resume, side by side.</p>
            <div className="relative mt-6 grid sm:grid-cols-2 gap-3" aria-hidden>
              <div className="rounded-2xl bg-peach/80 border border-apricot p-4">
                <p className="eyebrow">Job description · line 7</p>
                <p className="mt-2 font-serif">• Experience with <mark className="hl-match">React.js or Vue</mark> is required.</p>
              </div>
              <div className="rounded-2xl bg-sage/60 border border-sage p-4">
                <p className="eyebrow">Your resume · page 1 · Projects</p>
                <p className="mt-2 font-serif">Built a placement portal using <mark className="hl-match">ReactJS</mark> and NodeJS.</p>
              </div>
            </div>
            <p className="relative mt-4 text-sm text-ink-2 flex items-center gap-2"><Icon name="check" className="w-4 h-4 text-teal" /> “ReactJS” and “React.js” are both names for React.</p>
          </div>
          {/* JD language */}
          <div className="md:col-span-2 rounded-[1.25rem] bg-apricot/70 p-7 border border-white/70">
            <p className="eyebrow text-ink-2!">Reads JD language</p>
            <p className="font-serif text-2xl mt-2">Knows “must” from “nice to have”.</p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs" aria-hidden>
              <span className="chip bg-white/80 text-ink">Docker · Required</span>
              <span className="chip bg-white/80 text-ink">Kubernetes · Preferred</span>
              <span className="chip bg-white/80 text-ink">AWS · Not needed</span>
              <span className="chip bg-white/80 text-ink">Java or Python · Either</span>
            </div>
          </div>
          {/* Honest */}
          <div className="md:col-span-2 rounded-[1.25rem] bg-rose/80 p-7 border border-white/70">
            <p className="eyebrow text-ink-2!">Honest by design</p>
            <p className="font-serif text-2xl mt-2">Unsure? It asks, instead of guessing.</p>
            <p className="mt-3 text-sm text-ink-2">“Jenkins or a similar tool” and unreadable pages go to <strong>Needs review</strong>, never to your gaps.</p>
          </div>
          {/* Plan */}
          <div className="md:col-span-2 card-solid p-7">
            <p className="eyebrow">14-day plan</p>
            <p className="font-serif text-2xl mt-2">Small daily steps, one real project.</p>
            <div className="mt-5 grid grid-cols-7 gap-1.5" aria-hidden>
              {Array.from({ length: 14 }, (_, i) => <span key={i} className={`h-6 rounded-md ${i < 4 ? 'bg-honey' : i < 8 ? 'bg-blush' : i < 11 ? 'bg-sage' : 'bg-sand'}`} />)}
            </div>
          </div>
          {/* Layouts */}
          <div className="md:col-span-2 rounded-[1.25rem] bg-sage/80 p-7 border border-white/70">
            <p className="eyebrow text-ink-2!">Real resumes</p>
            <p className="font-serif text-2xl mt-2">Columns, tables and icons, handled.</p>
            <p className="mt-3 text-sm text-ink-2">Text positions are used to rebuild reading order, so two-column templates don’t turn into word soup.</p>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section aria-labelledby="compare-h" className="mx-auto max-w-6xl px-5 sm:px-8 mt-24">
        <div className="grid lg:grid-cols-[1fr_1.3fr] gap-10 items-center">
          <div>
            <p className="eyebrow">Why Alignly</p>
            <h2 id="compare-h" className="font-serif text-[2.2rem] sm:text-[2.6rem] leading-tight mt-2">A match score tells you little. Evidence tells you what to do.</h2>
            <p className="mt-4 text-ink-2">A typical keyword checker counts matching words. Alignly explains each requirement, so you know exactly what to add, fix or learn.</p>
          </div>
          <div className="card-solid overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-shell text-left">
                  <th scope="col" className="px-5 py-3 font-semibold">What you get</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-center text-ink-3">Keyword checker</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-center">Alignly</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map(([t, a, b]) => (
                  <tr key={t} className="border-t rule">
                    <td className="px-5 py-3">{t}</td>
                    <td className="px-4 py-3 text-center">{a ? '✓' : <span className="text-ink-3" aria-label="No">—</span>}</td>
                    <td className="px-4 py-3 text-center"><span className="inline-grid place-items-center w-6 h-6 rounded-full bg-sage text-teal" aria-label={b ? 'Yes' : 'No'}><Icon name="check" className="w-3.5 h-3.5" /></span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section id="privacy" className="mx-auto max-w-6xl px-5 sm:px-8 mt-24 scroll-mt-20">
        <div className="rounded-[1.75rem] bg-linear-to-br from-sage via-mist to-petal p-8 sm:p-12 grid md:grid-cols-[auto_1fr] gap-8 items-center">
          <span className="grid place-items-center w-16 h-16 rounded-3xl bg-white/80 text-teal shadow-sm"><Icon name="lock" className="w-8 h-8" /></span>
          <div>
            <p className="eyebrow text-ink-2!">Privacy</p>
            <h2 className="font-serif text-[2rem] leading-tight mt-1">Your resume is yours.</h2>
            <ul className="mt-4 grid sm:grid-cols-3 gap-4 text-sm text-ink-2">
              <li>{STATIC ? 'Your PDF is read inside your browser and never uploaded.' : 'Your PDF is read for one request and deleted right after.'}</li>
              <li>Nothing is saved unless you press <strong>Save to dashboard</strong>, and then only in this browser.</li>
              <li>Delete your account and every saved analysis from your profile at any time.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-5 sm:px-8 mt-24 scroll-mt-20">
        <p className="eyebrow text-center">FAQ</p>
        <h2 className="font-serif text-[2.2rem] leading-tight mt-2 text-center">Questions, answered</h2>
        <div className="mt-8 space-y-3">
          {FAQ.map(([q, a], i) => (
            <div key={q} className="card-solid">
              <button className="w-full flex items-center justify-between gap-4 text-left px-6 py-4 font-semibold" aria-expanded={faq === i} aria-controls={`faq-${i}`} onClick={() => setFaq(faq === i ? null : i)}>
                {q} <span className={`grid place-items-center w-7 h-7 rounded-full shrink-0 transition-transform ${faq === i ? 'bg-apricot rotate-45' : 'bg-shell'}`}><Icon name="plus" className="w-4 h-4" /></span>
              </button>
              {faq === i && <p id={`faq-${i}`} className="px-6 pb-5 -mt-1 text-ink-2 fade-in">{a}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="mx-auto max-w-6xl px-5 sm:px-8 mt-24">
        <div className="relative overflow-hidden rounded-[1.75rem] bg-ink text-white px-8 sm:px-14 py-14 text-center">
          <div className="absolute -left-16 -top-20 w-72 h-72 rounded-full bg-blush/40 blur-3xl" aria-hidden />
          <div className="absolute -right-10 -bottom-24 w-80 h-80 rounded-full bg-sage/30 blur-3xl" aria-hidden />
          <div className="relative">
            <p className="wordmark text-[4rem] sm:text-[5rem] text-honey" aria-hidden>alignly</p>
            <h2 className="font-serif text-[2.2rem] sm:text-[2.8rem] leading-tight mt-4">Your next application, aligned.</h2>
            <p className="mt-3 text-white/75 max-w-xl mx-auto">Create a free account to save analyses and track your two-week plans, or try the demo first.</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <button className="btn bg-honey text-ink hover:bg-apricot" onClick={session ? onDashboard : onRegister}>{session ? 'Open dashboard' : 'Create free account'} <Icon name="arrow" /></button>
              <button className="btn border border-white/40 text-white hover:bg-white/10" onClick={onDemo}>Try the live demo</button>
            </div>
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-5 sm:px-8 mt-16 pb-10 grid sm:grid-cols-[1.4fr_1fr_1fr] gap-8 text-sm">
        <div>
          <Logo />
          <p className="mt-3 text-ink-3 max-w-xs">Evidence-based resume and job description alignment, with a plan for what’s missing.</p>
        </div>
        <div>
          <p className="eyebrow">Product</p>
          <ul className="mt-3 space-y-2 text-ink-2">
            <li><button className="hover:text-ink" onClick={() => scrollTo('how')}>How it works</button></li>
            <li><button className="hover:text-ink" onClick={() => scrollTo('features')}>Features</button></li>
            <li><button className="hover:text-ink" onClick={onDemo}>Live demo</button></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow">Project</p>
          <ul className="mt-3 space-y-2 text-ink-2">
            <li>Built for Code Fuzion 2026</li>
            <li><button className="hover:text-ink" onClick={() => scrollTo('privacy')}>Privacy</button></li>
            <li><button className="hover:text-ink" onClick={() => scrollTo('faq')}>FAQ</button></li>
          </ul>
        </div>
      </footer>
    </div>
  );
}

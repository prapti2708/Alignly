import { Icon } from './Icons.tsx';

/** Decorative preview of the results, built from real UI pieces. */
export function HeroPreview() {
  return (
    <div className="relative h-[28rem] hidden lg:block" aria-hidden>
      <div className="absolute left-16 -top-2 w-14 h-14 rounded-full bg-blush/70 blur-[1px]" />
      <div className="absolute left-6 bottom-6 w-16 h-16 rounded-full bg-sage" />
      <div className="absolute right-6 top-2 w-[21rem] card-solid p-5 rotate-[2.5deg] rise" style={{ animationDelay: '0.15s' }}>
        <div className="flex items-center justify-between">
          <span className="chip chip-match"><Icon name="matched" className="w-3.5 h-3.5" /> Evidence found</span>
          <span className="font-mono text-[0.7rem] text-ink-3">L7</span>
        </div>
        <p className="font-serif text-xl mt-3">React.js or Vue</p>
        <p className="mt-2 text-sm text-ink-2">Your resume says <mark className="hl-match">ReactJS</mark>. This matches <mark className="hl-match">React.js</mark> in the JD.</p>
      </div>
      <div className="absolute left-0 top-32 w-[23rem] card-solid p-5 -rotate-[2deg] rise" style={{ animationDelay: '0.3s' }}>
        <div className="flex items-center justify-between">
          <span className="chip chip-gap"><Icon name="gap" className="w-3.5 h-3.5" /> No evidence found</span>
          <span className="chip chip-quiet">Required · Gap 1</span>
        </div>
        <p className="font-serif text-xl mt-3">Docker</p>
        <div className="mt-3 rounded-xl bg-peach/70 px-3 py-2.5 flex gap-3">
          <span className="font-mono text-[0.7rem] text-ink-3 pt-1">8</span>
          <p className="font-serif text-[0.98rem] leading-snug"><mark className="hl-gap">Docker</mark> is required for packaging services.</p>
        </div>
      </div>
      <div className="absolute right-0 -bottom-1 w-[19rem] card-solid p-4 rotate-[1deg] rise" style={{ animationDelay: '0.45s' }}>
        <p className="eyebrow">Your two weeks</p>
        <div className="mt-3 grid grid-cols-7 gap-1.5">
          {Array.from({ length: 14 }, (_, i) => (
            <span key={i} className={`h-7 rounded-md ${i < 4 ? 'bg-honey' : i < 8 ? 'bg-blush' : i < 11 ? 'bg-sage' : 'bg-sand'} ${i < 3 ? 'ring-2 ring-white' : ''}`} />
          ))}
        </div>
        <p className="mt-3 text-xs text-ink-3">30–45 minutes a day · ends with one small project</p>
      </div>
    </div>
  );
}

export const FEATURES = [
  { icon: 'file', title: 'Reads real resumes', text: 'Two columns, tables, icons and (on the server) scanned pages.', bg: 'bg-blush/45' },
  { icon: 'matched', title: 'Shows its evidence', text: 'Every verdict links to the exact JD line and your resume excerpt.', bg: 'bg-sage/70' },
  { icon: 'spark', title: 'Plans your next step', text: 'A focused 14-day plan for your top three verified gaps.', bg: 'bg-apricot/60' },
];


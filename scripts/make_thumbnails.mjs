// Renders Alignly brand images with Playwright:
//   public/brand/alignly-social.png   1200×630 social / GitHub preview that shows what Alignly does:
//                                     JD requirements linked to resume evidence, and a gap flowing into the plan
//   public/brand/alignly-icon-{512,180,32}.png
// Usage: CHROME_PATH=/path/to/chrome node scripts/make_thumbnails.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';

const icon = fs.readFileSync('public/brand/alignly-icon.svg', 'utf8');
const wordmarkFont = 'data:font/ttf;base64,' + fs.readFileSync('public/brand/alignly-wordmark.ttf').toString('base64');
const C = { ink: '#3a2e2b', ink2: '#5e504b', ink3: '#776761', blush: '#f5c7bd', rose: '#f6d6cf', petal: '#f6e2de', sage: '#dae2dc', sageDeep: '#3d6b59', sageMid: '#9fbfae', apricot: '#f9d8be', honey: '#f6caa0', peach: '#fbe6db', sand: '#ebe4dc', ember: '#9a4a2a', paper: '#fbf7f4', rule: '#eaddd7' };
const sans = `'Inter', system-ui, sans-serif`;
const serif = `'Lora', 'Gelasio', Georgia, serif`;

// Geometry (everything sits on a shared grid: the point of the product is alignment)
const JD = { x: 506, y: 92, w: 324, rowY0: 168, gap: 58 };
const RS = { x: 868, y: 92, w: 296, rowY0: 168, gap: 58 };
const rowsJD = [
  { t: 'React.js or Vue', tag: 'Required', s: 'ok' },
  { t: 'SQL and REST APIs', tag: 'Required', s: 'ok' },
  { t: 'Docker', tag: 'Required', s: 'gap' },
  { t: 'Git', tag: 'Required', s: 'ok' },
];
const rowsRS = [
  { t: 'Placement portal in ', hl: 'ReactJS' },
  { t: 'Fixed ', hl: 'SQL', t2: ' queries, REST APIs' },
  { t: 'Hostel expense splitter', muted: true },
  { t: 'Skills: ', hl: 'Git', t2: ', Linux' },
];
const cy = (o, i) => 184 + i * o.gap; // row centre (card top 92 + padding + header + row margin)

const row = (r) => {
  const dot = r.s === 'ok' ? `<span style="width:22px;height:22px;border-radius:50%;background:${C.sage};color:${C.sageDeep};display:grid;place-items:center;font-size:13px;font-weight:800">✓</span>`
    : `<span style="width:22px;height:22px;border-radius:50%;background:${C.apricot};color:${C.ember};display:grid;place-items:center;font-size:15px;font-weight:800">–</span>`;
  return `<div style="height:40px;margin-top:18px;border-radius:12px;background:${r.s === 'gap' ? C.peach : '#fff'};border:1px solid ${r.s === 'gap' ? C.honey : C.rule};display:flex;align-items:center;gap:10px;padding:0 12px">
    ${dot}<span style="font-weight:600;font-size:16px;color:${C.ink}">${r.t}</span><span style="margin-left:auto;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${C.ink3}">${r.tag}</span></div>`;
};
const rrow = (r) => `<div style="height:40px;margin-top:18px;border-radius:12px;background:${r.muted ? 'transparent' : '#fff'};border:1px ${r.muted ? 'dashed' : 'solid'} ${C.rule};display:flex;align-items:center;padding:0 12px;font-size:15px;color:${r.muted ? C.ink3 : C.ink2}"><span style="white-space:pre">${r.t}${r.hl ? `<b style="background:${C.sage};color:${C.ink};padding:1px 6px;border-radius:6px;box-shadow:inset 0 -2px 0 ${C.sageDeep}">${r.hl}</b>` : ''}${r.t2 ?? ''}</span></div>`;

const card = (x, y, w, title, headBg, body) => `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;box-sizing:border-box;background:#fffdfb;border:1px solid ${C.rule};border-radius:22px;padding:16px 16px 20px;box-shadow:0 26px 50px -26px rgba(58,46,43,.35)">
  <div style="display:flex;align-items:center;gap:10px;background:${headBg};border-radius:12px;padding:9px 12px">
    <span style="width:10px;height:10px;border-radius:50%;background:#fff"></span><span style="font-size:13px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:${C.ink}">${title}</span>
  </div>${body}</div>`;

// Connectors: JD row (right edge) → resume row (left edge); gap row → plan
const links = [[0, 0], [1, 1], [3, 3]].map(([a, b]) => {
  const x1 = JD.x + JD.w - 17, y1 = cy(JD, a), x2 = RS.x + 17, y2 = cy(RS, b), mx = (x1 + x2) / 2;
  return `<path d="M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}" stroke="${C.sageMid}" stroke-width="4" fill="none" stroke-linecap="round"/>
          <circle cx="${x1}" cy="${y1}" r="6" fill="${C.sageDeep}"/><circle cx="${x2}" cy="${y2}" r="6" fill="${C.sageDeep}"/>`;
}).join('');
const gy = cy(JD, 2);
const PLAN = { x: 590, y: 470, w: 574 };
const gapLink = `<path d="M${JD.x + 40} ${gy + 22} C${JD.x + 40} ${PLAN.y - 20} ${PLAN.x + 30} ${PLAN.y - 40} ${PLAN.x + 60} ${PLAN.y + 2}" stroke="${C.honey}" stroke-width="4" fill="none" stroke-dasharray="2 10" stroke-linecap="round"/>
  <path d="M${PLAN.x + 50} ${PLAN.y - 12} l10 14 l14 -8" stroke="${C.honey}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;

const tiles = Array.from({ length: 14 }, (_, i) => `<span style="height:30px;border-radius:8px;background:${i < 4 ? C.honey : i < 8 ? C.blush : i < 11 ? C.sage : C.sand};${i === 0 ? `box-shadow:0 0 0 3px #fff,0 0 0 5px ${C.ember}` : ''}"></span>`).join('');

const social = `<!doctype html><html><head><style>
@font-face { font-family: 'AW'; src: url(${wordmarkFont}); }
@font-face { font-family: 'Lora'; src: url(data:font/ttf;base64,${fs.readFileSync('/mnt/skills/examples/canvas-design/canvas-fonts/Lora-Regular.ttf').toString('base64')}); }
@font-face { font-family: 'Lora'; font-style: italic; src: url(data:font/ttf;base64,${fs.readFileSync('/mnt/skills/examples/canvas-design/canvas-fonts/Lora-Italic.ttf').toString('base64')}); }
</style></head><body style="margin:0">
<div style="width:1200px;height:630px;position:relative;overflow:hidden;background:${C.paper};font-family:${sans};color:${C.ink}">
  <div style="position:absolute;width:820px;height:560px;left:-260px;top:-240px;border-radius:50%;background:radial-gradient(closest-side,${C.blush},transparent);opacity:.95"></div>
  <div style="position:absolute;width:760px;height:560px;right:-240px;bottom:-260px;border-radius:50%;background:radial-gradient(closest-side,${C.sage},transparent)"></div>
  <div style="position:absolute;width:640px;height:460px;left:330px;top:250px;border-radius:50%;background:radial-gradient(closest-side,${C.apricot},transparent);opacity:.8"></div>
  <div style="position:absolute;inset:0;background-image:radial-gradient(rgba(58,46,43,.05) 1px,transparent 1px);background-size:22px 22px"></div>

  <!-- Left: brand and promise -->
  <div style="position:absolute;left:70px;top:70px;width:410px">
    <div style="display:flex;align-items:center;gap:12px">
      <div style="width:54px;height:54px">${icon.replace('<svg ', '<svg width="54" height="54" ')}</div>
      <span style="font-size:14px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${C.ink2};background:rgba(255,255,255,.7);border:1px solid ${C.rule};border-radius:999px;padding:6px 14px">Resume × Job description</span>
    </div>
    <div style="font-family:'AW';font-size:132px;line-height:1;margin-top:26px;letter-spacing:-0.01em;-webkit-text-stroke:3px ${C.ink}">alignly</div>
    <div style="font-family:${serif};font-size:36px;line-height:1.18;margin-top:22px">See exactly where your resume <i style="color:${C.ember}">proves</i> the job, and where it doesn’t yet.</div>
    <div style="margin-top:28px;display:grid;gap:10px;font-size:17px;color:${C.ink2}">
      <div style="display:flex;align-items:center;gap:10px"><span style="width:14px;height:14px;border-radius:50%;background:${C.sageMid}"></span>Every requirement linked to your evidence</div>
      <div style="display:flex;align-items:center;gap:10px"><span style="width:14px;height:14px;border-radius:50%;background:${C.honey}"></span>Every gap turned into a 14-day plan</div>
    </div>
  </div>

  <!-- Right: the product, in one picture -->
  <svg width="1200" height="630" style="position:absolute;inset:0;pointer-events:none">${links}${gapLink}</svg>
  ${card(JD.x, JD.y, JD.w, 'Job description', C.apricot, rowsJD.map(row).join(''))}
  ${card(RS.x, RS.y, RS.w, 'Your resume', C.sage, rowsRS.map(rrow).join(''))}
  <svg width="1200" height="630" style="position:absolute;inset:0;pointer-events:none">${links}</svg>

  <div style="position:absolute;left:${(JD.x + JD.w + RS.x) / 2 - 64}px;top:40px;width:128px;text-align:center;background:${C.ink};color:#fff;border-radius:999px;padding:9px 0;font-size:15px;font-weight:700;box-shadow:0 12px 24px -12px rgba(58,46,43,.6)">3 of 4 proven</div>

  <div style="position:absolute;left:${PLAN.x}px;top:${PLAN.y}px;width:${PLAN.w}px;box-sizing:border-box;background:#fffdfb;border:1px solid ${C.rule};border-radius:22px;padding:16px 20px;box-shadow:0 26px 50px -26px rgba(58,46,43,.35)">
    <div style="display:flex;align-items:baseline;justify-content:space-between">
      <span style="font-size:13px;font-weight:800;letter-spacing:.1em;text-transform:uppercase">Your 14-day plan</span>
      <span style="font-size:14px;color:${C.ink3}">Day 1 · Docker · Run your first containers · 30 min</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(14,1fr);gap:7px;margin-top:12px">${tiles}</div>
  </div>
</div></body></html>`;

const iconPage = (size) => `<!doctype html><html><body style="margin:0;background:transparent"><div style="width:${size}px;height:${size}px">${icon.replace('<svg ', `<svg width="${size}" height="${size}" `)}</div></body></html>`;

const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
await p.setContent(social);
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(300);
await p.screenshot({ path: 'public/brand/alignly-social.png' });
for (const size of [512, 180, 32]) {
  await p.setViewportSize({ width: size, height: size });
  await p.setContent(iconPage(size));
  await p.screenshot({ path: `public/brand/alignly-icon-${size}.png`, omitBackground: true });
}
await b.close();
console.log('wrote public/brand/*');

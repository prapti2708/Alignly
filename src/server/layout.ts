// Pure layout helpers shared by the server extractor and the in-browser extractor (no Node APIs).
import type { ResumePage } from '../engine/resume.ts';

export interface Box { x: number; y: number; w: number; h: number }
export interface ExtractedLine { text: string; box: Box; source: 'text' | 'ocr' }
export interface ExtractedPage extends ResumePage {
  width: number;
  height: number;
  lines: ExtractedLine[];
  /** Plain-language note shown in the review screen. */
  note?: string;
}
export interface ExtractResult {
  pages: ExtractedPage[];
  previews: string[];
  warnings: string[];
  ms: number;
}
export type Progress = (p: { message: string; page?: number; pages?: number; pct: number }) => void;


// ---------- text cleaning ----------

const ICONS = /[\uE000-\uF8FF\u{F0000}-\u{FFFFD}\u{100000}-\u{10FFFD}\u2600-\u27BF\u{1F000}-\u{1FAFF}\u2B00-\u2BFF\uFFFD\u25A0-\u25FF\u200B-\u200F\uFE0F]/gu;
const BULLETS = /^[\s\u2022\u25CF\u25AA\u25A0\u25C6\u2666\u25BA\u25B6\u27A4\u2713\u2714\u00B7*\-\u2013]+/;

export function cleanText(s: string): string {
  return s
    .replace(/[\u25CF\u25AA\u25A0\u25C6\u2666\u25BA\u25B6\u27A4\u2713\u2714]/g, '\u2022')
    .replace(ICONS, ' ')
    .replace(/[\u0000-\u0008\u000B-\u001F]/g, ' ')
    .replace(/\uFB01/g, 'fi').replace(/\uFB02/g, 'fl')
    .replace(/[ \t\u00A0]+/g, ' ');
}

export function usableText(text: string): { usable: boolean; alnum: number } {
  const compact = text.replace(/\s+/g, '');
  const alnum = (compact.match(/[A-Za-z0-9]/g) ?? []).length;
  const words = (text.match(/[A-Za-z]{3,}/g) ?? []).length;
  // Broken font encodings produce symbol soup with few real words.
  const usable = alnum >= 25 && words >= 4 && alnum / Math.max(1, compact.length) > 0.55;
  return { usable, alnum };
}

// ---------- layout ----------

export interface Run { str: string; x: number; y: number; w: number; h: number }
interface Seg { runs: Run[]; x0: number; x1: number; y: number; h: number }

function toLines(runs: Run[]): Run[][] {
  const sorted = [...runs].sort((a, b) => a.y - b.y || a.x - b.x);
  const lines: Run[][] = [];
  for (const r of sorted) {
    const line = lines.find((l) => Math.abs(l[0].y - r.y) <= Math.max(2, 0.45 * Math.min(l[0].h, r.h)));
    if (line) line.push(r);
    else lines.push([r]);
  }
  lines.forEach((l) => l.sort((a, b) => a.x - b.x));
  return lines.sort((a, b) => a[0].y - b[0].y);
}

function toSegments(line: Run[]): Seg[] {
  const segs: Seg[] = [];
  for (const r of line) {
    const last = segs[segs.length - 1];
    const gap = last ? r.x - last.x1 : Infinity;
    // A gap wider than ~1.8 em separates table cells or columns.
    if (last && gap < Math.max(10, 1.8 * r.h)) {
      last.runs.push(r);
      last.x1 = Math.max(last.x1, r.x + r.w);
    } else {
      segs.push({ runs: [r], x0: r.x, x1: r.x + r.w, y: r.y, h: r.h });
    }
  }
  return segs;
}

function segText(s: Seg): string {
  let out = '';
  let prevEnd = -1;
  for (const r of s.runs) {
    const t = r.str;
    if (!t) continue;
    if (out && prevEnd >= 0 && r.x - prevEnd > 0.18 * r.h && !out.endsWith(' ') && !t.startsWith(' ')) out += ' ';
    out += t;
    prevEnd = r.x + r.w;
  }
  return out.replace(/\s+/g, ' ').trim();
}

/** Finds a vertical gutter that consistently separates two columns of text. */
export function findGutter(lines: Seg[][], width: number): number | null {
  const segs = lines.flat();
  if (segs.length < 8) return null;
  const top = Math.min(...segs.map((s) => s.y));
  const bottom = Math.max(...segs.map((s) => s.y));
  const height = Math.max(1, bottom - top);
  let best: { gx: number; cross: number } | null = null;
  for (let gx = width * 0.22; gx <= width * 0.78; gx += 2) {
    let left = 0, right = 0, cross = 0;
    const ly: number[] = [], ry: number[] = [];
    for (const s of segs) {
      if (s.x1 <= gx) { left++; ly.push(s.y); }
      else if (s.x0 >= gx) { right++; ry.push(s.y); }
      else cross++;
    }
    if (left < 4 || right < 4) continue;
    if (cross > Math.max(2, 0.15 * segs.length)) continue;
    // Both columns must run a good part of the page; a small table is not a column layout.
    const lSpan = Math.max(...ly) - Math.min(...ly);
    const rSpan = Math.max(...ry) - Math.min(...ry);
    const overlap = Math.min(Math.max(...ly), Math.max(...ry)) - Math.max(Math.min(...ly), Math.min(...ry));
    if (lSpan < 0.4 * height || rSpan < 0.4 * height || overlap < 0.3 * height) continue;
    if (!best || cross < best.cross) best = { gx, cross };
  }
  if (!best) return null;
  // Centre the gutter inside the empty band.
  let lo = best.gx, hi = best.gx;
  const free = (gx: number) => segs.filter((s) => s.x0 < gx && s.x1 > gx).length <= best!.cross;
  while (lo - 2 > width * 0.15 && free(lo - 2)) lo -= 2;
  while (hi + 2 < width * 0.85 && free(hi + 2)) hi += 2;
  return (lo + hi) / 2;
}

function boxOf(segs: Seg[]): Box {
  const x0 = Math.min(...segs.map((s) => s.x0));
  const x1 = Math.max(...segs.map((s) => s.x1));
  const y0 = Math.min(...segs.map((s) => s.y - s.h));
  const y1 = Math.max(...segs.map((s) => s.y));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** Orders text runs into reading order and returns one entry per visual line or table row. */
export function layoutRuns(runs: Run[], width: number): ExtractedLine[] {
  const lines = toLines(runs.filter((r) => r.str.trim())).map(toSegments);
  const gx = findGutter(lines, width);
  const emit = (segs: Seg[]): ExtractedLine | null => {
    const text = segs.map(segText).filter(Boolean).join(' | ');
    return text ? { text, box: boxOf(segs), source: 'text' } : null;
  };
  if (gx === null) return lines.map(emit).filter((l): l is ExtractedLine => !!l);

  // Two columns: full-width lines split the page into bands; inside a band read left, then right.
  const out: ExtractedLine[] = [];
  let left: Seg[][] = [], right: Seg[][] = [];
  const flush = () => {
    for (const l of [...left, ...right]) { const e = emit(l); if (e) out.push(e); }
    left = []; right = [];
  };
  for (const line of lines) {
    const spans = line.some((s) => s.x0 < gx && s.x1 > gx);
    if (spans) { flush(); const e = emit(line); if (e) out.push(e); continue; }
    const l = line.filter((s) => s.x1 <= gx);
    const r = line.filter((s) => s.x0 >= gx);
    if (l.length) left.push(l);
    if (r.length) right.push(r);
  }
  flush();
  return out;
}

// ---------- images (for mixed pages) ----------

export type Mat = [number, number, number, number, number, number];
const mul = (m: Mat, n: Mat): Mat => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];

export async function imageBoxes(page: any, OPS: any, vh: number): Promise<Box[]> {
  const ops = await page.getOperatorList();
  const boxes: Box[] = [];
  let ctm: Mat = [1, 0, 0, 1, 0, 0];
  const stack: Mat[] = [];
  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    const args = ops.argsArray[i];
    if (fn === OPS.save) stack.push(ctm);
    else if (fn === OPS.restore) ctm = stack.pop() ?? [1, 0, 0, 1, 0, 0];
    else if (fn === OPS.transform) ctm = mul(ctm, args as Mat);
    else if (fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject || fn === OPS.paintImageXObjectRepeat) {
      const xs = [ctm[4], ctm[4] + ctm[0], ctm[4] + ctm[2], ctm[4] + ctm[0] + ctm[2]];
      const ys = [ctm[5], ctm[5] + ctm[1], ctm[5] + ctm[3], ctm[5] + ctm[1] + ctm[3]];
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      boxes.push({ x: x0, y: vh - y1, w: x1 - x0, h: y1 - y0 });
    }
  }
  return boxes;
}

export const area = (b: Box) => Math.max(0, b.w) * Math.max(0, b.h);
export function overlapArea(a: Box, b: Box): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

// Resume PDF extraction.
// 1. Text layer via pdfjs-dist: every text run keeps its page coordinates.
// 2. Layout recovery: runs → lines → segments; a consistent vertical gutter splits two-column pages;
//    table rows keep their cells separated by " | ".
// 3. Decorative icons (Font Awesome private-use glyphs, dingbats, emoji) are stripped.
// 4. OCR per page (poppler pdftoppm + tesseract CLI) when the text layer is missing or unusable, and for
//    scanned regions on pages that also have selectable text. OCR words that overlap text-layer lines are
//    dropped so nothing is duplicated.
// Documents are processed in memory and a private temp directory that is deleted afterwards.
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { area, cleanText, imageBoxes, layoutRuns, overlapArea, usableText, type Box, type ExtractedLine, type ExtractedPage, type ExtractResult, type Progress, type Run } from './layout.ts';

export type { Box, ExtractedLine, ExtractedPage, ExtractResult, Progress };
export { cleanText, layoutRuns };

const run = promisify(execFile);

export const LIMITS = { maxBytes: 10 * 1024 * 1024, maxPages: 12 };
const ocrTimeout = () => Number(process.env.ALIGNLY_OCR_TIMEOUT_MS ?? 25_000);

// ---------- OCR ----------

export interface OcrOptions { dpi?: number; psm?: number }

async function ocrPage(dir: string, pdfPath: string, pageNo: number, pageW: number, opts: OcrOptions = {}): Promise<{ lines: ExtractedLine[]; confidence: number }> {
  const dpi = opts.dpi ?? 300;
  const base = path.join(dir, `ocr-${pageNo}`);
  await run('pdftoppm', ['-r', String(dpi), '-f', String(pageNo), '-l', String(pageNo), '-png', '-singlefile', '-gray', pdfPath, base], { timeout: 60_000 });
  const { stdout } = await run('tesseract', [`${base}.png`, 'stdout', '-l', 'eng', '--psm', String(opts.psm ?? 3), 'tsv'], { timeout: ocrTimeout(), maxBuffer: 32 * 1024 * 1024, env: { ...process.env, OMP_THREAD_LIMIT: '1' } });
  await fs.rm(`${base}.png`, { force: true });
  const scale = 72 / dpi;
  const groups = new Map<string, { words: { t: string; x: number; y: number; w: number; h: number; c: number }[] }>();
  for (const row of stdout.split('\n').slice(1)) {
    const c = row.split('\t');
    if (c.length < 12 || c[0] !== '5') continue;
    const t = c[11]?.trim();
    const conf = Number(c[10]);
    if (!t || conf < 0) continue;
    const key = `${c[2]}-${c[3]}-${c[4]}`;
    const g = groups.get(key) ?? { words: [] };
    g.words.push({ t, x: +c[6] * scale, y: +c[7] * scale, w: +c[8] * scale, h: +c[9] * scale, c: conf });
    groups.set(key, g);
  }
  const lines: ExtractedLine[] = [];
  let confSum = 0, n = 0;
  for (const g of groups.values()) {
    const ws = g.words.sort((a, b) => a.x - b.x);
    // Split OCR lines at wide gaps too, so table cells stay separate.
    let text = '';
    ws.forEach((w, i) => {
      if (i > 0) text += w.x - (ws[i - 1].x + ws[i - 1].w) > Math.max(12, 2.2 * w.h) ? ' | ' : ' ';
      text += w.t;
      confSum += w.c; n++;
    });
    const x0 = Math.min(...ws.map((w) => w.x)), x1 = Math.max(...ws.map((w) => w.x + w.w));
    const y0 = Math.min(...ws.map((w) => w.y)), y1 = Math.max(...ws.map((w) => w.y + w.h));
    const clean = cleanText(text).trim();
    if (clean) lines.push({ text: clean, box: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, source: 'ocr' });
  }
  void pageW;
  return { lines, confidence: n ? Math.round(confSum / n) : 0 };
}

// ---------- main ----------

async function loadPdf(data: Uint8Array) {
  const pdfjs: any = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const fontDir = path.join(path.dirname(createRequire(import.meta.url).resolve('pdfjs-dist/package.json')), 'standard_fonts') + path.sep;
  const task = pdfjs.getDocument({ data, standardFontDataUrl: fontDir, isEvalSupported: false, disableFontFace: true, useSystemFonts: false, verbosity: 0 });
  const doc = await task.promise;
  return { doc, task, OPS: pdfjs.OPS };
}

export function isPdf(buf: Uint8Array): boolean {
  return buf.length > 5 && Buffer.from(buf.subarray(0, 1024)).toString('latin1').includes('%PDF-');
}

export async function extractPdf(buf: Buffer, onProgress: Progress = () => {}, only?: { page: number; forceOcr?: boolean; ocr?: OcrOptions }): Promise<ExtractResult> {
  const t0 = Date.now();
  if (!isPdf(buf)) throw new UserError('This file is not a PDF. Upload your resume as a .pdf file.');
  if (buf.length > LIMITS.maxBytes) throw new UserError('This PDF is larger than 10 MB. Export a smaller copy and try again.');
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'alignly-'));
  try {
    const pdfPath = path.join(dir, 'resume.pdf');
    await fs.writeFile(pdfPath, buf, { mode: 0o600 });
    let doc: any, OPS: any, task: any;
    try {
      ({ doc, OPS, task } = await loadPdf(new Uint8Array(buf)));
    } catch (e: any) {
      if (e?.name === 'PasswordException') throw new UserError('This PDF is password-protected. Remove the password and upload it again.');
      throw new UserError('We could not open this PDF. It may be damaged. Try exporting it again from your editor.');
    }
    const total = doc.numPages;
    if (total > LIMITS.maxPages && !only) throw new UserError(`This PDF has ${total} pages. Resumes are usually 1–2 pages; upload one with at most ${LIMITS.maxPages}.`);
    const warnings: string[] = [];
    const pages: ExtractedPage[] = [];
    const pageNos = only ? [only.page] : Array.from({ length: total }, (_, i) => i + 1);

    for (const n of pageNos) {
      const pct = (k: number) => Math.round(5 + ((pageNos.indexOf(n) + k) / pageNos.length) * 80);
      onProgress({ message: `Reading the text layer on page ${n}`, page: n, pages: total, pct: pct(0) });
      const page = await doc.getPage(n);
      const vp = page.getViewport({ scale: 1 });
      const tc = await page.getTextContent({ includeMarkedContent: false });
      const runs: Run[] = [];
      for (const it of tc.items as any[]) {
        if (typeof it.str !== 'string') continue;
        const str = cleanText(it.str);
        if (!str.trim()) continue;
        const [, , , d, e, f] = it.transform as number[];
        const h = Math.abs(it.height || d) || 10;
        runs.push({ str, x: e, y: vp.height - f, w: it.width, h });
      }
      let lines = layoutRuns(runs, vp.width);
      const textJoined = lines.map((l) => l.text).join('\n');
      const { usable } = usableText(textJoined);
      let source: ExtractedPage['source'] = 'text';
      let confidence = 100;
      let note: string | undefined;

      const images = await imageBoxes(page, OPS, vp.height);
      const pageArea = vp.width * vp.height;
      // Large images with little text on top of them look like scanned content.
      const scannedRegions = images.filter((b) => area(b) > 0.04 * pageArea && b.w > 0.3 * vp.width && lines.filter((l) => overlapArea(l.box, b) > 0.5 * area(l.box)).reduce((a, l) => a + area(l.box), 0) < 0.05 * area(b));
      const needsOcr = only?.forceOcr || !usable;
      const mixed = !needsOcr && scannedRegions.length > 0;

      if (needsOcr || mixed) {
        onProgress({ message: `Running OCR on page ${n}${mixed ? ' (scanned section)' : ''}`, page: n, pages: total, pct: pct(0.4) });
        try {
          const ocr = await ocrPage(dir, pdfPath, n, vp.width, only?.ocr);
          if (needsOcr) {
            lines = ocr.lines;
            confidence = ocr.confidence;
            source = 'ocr';
            const ok = usableText(lines.map((l) => l.text).join('\n')).usable && confidence >= 35;
            if (!ok) {
              source = 'unreadable';
              note = `Page ${n} has no usable text layer and OCR could not read it reliably${confidence ? ` (confidence ${confidence}%)` : ''}. Retry OCR, or type or paste this page's text.`;
            } else {
              note = `Page ${n} had no usable text layer, so we read it with OCR (confidence ${confidence}%). Check names of tools for OCR slips.`;
            }
          } else {
            // Keep text-layer lines; add OCR lines from scanned regions that don't duplicate them.
            const extra = ocr.lines.filter((o) =>
              scannedRegions.some((r) => overlapArea(o.box, r) > 0.5 * area(o.box)) &&
              !lines.some((l) => overlapArea(o.box, l.box) > 0.3 * Math.min(area(o.box), area(l.box))));
            if (extra.length) {
              lines = [...lines, ...extra].sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x);
              source = 'mixed';
              confidence = ocr.confidence;
              note = `Page ${n} mixes selectable text with a scanned section. We added ${extra.length} OCR line${extra.length > 1 ? 's' : ''} from the scanned part.`;
            }
          }
        } catch (e: any) {
          if (needsOcr) {
            source = 'unreadable';
            confidence = 0;
            lines = [];
            note = e?.code === 'ENOENT'
              ? `Page ${n} needs OCR, but the OCR tools (tesseract, pdftoppm) are not installed on this server. Paste this page's text instead.`
              : e?.killed
                ? `Page ${n} looks like an image, but OCR could not make sense of it in time (it may be a photo, a logo or very noisy). Retry OCR, or type or paste this page's text.`
                : `Page ${n} needs OCR, but OCR failed. Retry, or paste this page's text.`;
          } else warnings.push(`OCR of the scanned section on page ${n} failed; only its selectable text was used.`);
        }
      }
            pages.push({ page: n, width: vp.width, height: vp.height, lines, text: lines.map((l) => l.text).join('\n'), source, confidence, note });
      page.cleanup();
      onProgress({ message: `Finished page ${n}`, page: n, pages: total, pct: pct(1) });
    }

    onProgress({ message: 'Rendering page previews', pct: 90 });
    const previews: string[] = [];
    if (!only) {
      try {
        await run('pdftoppm', ['-r', '60', '-png', '-l', String(Math.min(total, LIMITS.maxPages)), pdfPath, path.join(dir, 'prev')], { timeout: 60_000 });
        const files = (await fs.readdir(dir)).filter((f) => f.startsWith('prev')).sort((a, b) => parseInt(a.replace(/\D/g, '')) - parseInt(b.replace(/\D/g, '')));
        for (const f of files) previews.push('data:image/png;base64,' + (await fs.readFile(path.join(dir, f))).toString('base64'));
      } catch {
        warnings.push('Page previews are unavailable on this server (pdftoppm missing). The original PDF is still shown by your browser.');
      }
    }
    await task.destroy();
    for (const p of pages) if (p.source === 'unreadable') warnings.push(p.note!);
    return { pages, previews, warnings, ms: Date.now() - t0 };
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

export class UserError extends Error {}

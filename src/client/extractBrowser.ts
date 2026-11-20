// In-browser PDF extraction for the static (no-server) build. Same layout logic as the server:
// text layer with coordinates → lines, table cells, two-column recovery, icon stripping.
// OCR needs the server's tesseract, so pages without a usable text layer are marked unreadable
// and the student is asked to paste that page's text. The PDF never leaves the browser.
import * as pdfjs from 'pdfjs-dist/build/pdf.min.mjs';
import * as worker from 'pdfjs-dist/build/pdf.worker.min.mjs';
import { area, cleanText, imageBoxes, layoutRuns, overlapArea, usableText, type ExtractResult, type ExtractedPage, type Run } from '../server/layout.ts';

// Run the PDF.js worker code on the main thread (no separate worker file to host).
(globalThis as any).pdfjsWorker = worker;

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_PAGES = 12;

export async function extractInBrowser(
  data: ArrayBuffer,
  onProgress: (p: { message: string; page?: number; pages?: number; pct: number }) => void,
): Promise<ExtractResult> {
  const t0 = performance.now();
  const head = new TextDecoder('latin1').decode(new Uint8Array(data.slice(0, 1024)));
  if (!head.includes('%PDF-')) throw new Error('This file is not a PDF. Upload your resume as a .pdf file.');
  if (data.byteLength > MAX_BYTES) throw new Error('This PDF is larger than 10 MB. Export a smaller copy and try again.');

  let doc: any;
  const task = (pdfjs as any).getDocument({ data: new Uint8Array(data.slice(0)), isEvalSupported: false, disableFontFace: false, verbosity: 0 });
  try {
    doc = await task.promise;
  } catch (e: any) {
    if (e?.name === 'PasswordException') throw new Error('This PDF is password-protected. Remove the password and upload it again.');
    throw new Error('We could not open this PDF. It may be damaged. Try exporting it again from your editor.');
  }
  const total = doc.numPages;
  if (total > MAX_PAGES) throw new Error(`This PDF has ${total} pages. Resumes are usually 1–2 pages; upload one with at most ${MAX_PAGES}.`);
  const pages: ExtractedPage[] = [];
  const previews: string[] = [];
  const warnings: string[] = [];
  const OPS = (pdfjs as any).OPS;

  for (let n = 1; n <= total; n++) {
    const pct = (k: number) => Math.round(5 + ((n - 1 + k) / total) * 90);
    onProgress({ message: `Reading the text layer on page ${n}`, page: n, pages: total, pct: pct(0) });
    const page = await doc.getPage(n);
    const vp = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    const runs: Run[] = [];
    for (const it of tc.items as any[]) {
      if (typeof it.str !== 'string') continue;
      const str = cleanText(it.str);
      if (!str.trim()) continue;
      const [, , , d, e, f] = it.transform as number[];
      runs.push({ str, x: e, y: vp.height - f, w: it.width, h: Math.abs(it.height || d) || 10 });
    }
    onProgress({ message: `Recovering columns and table rows on page ${n}`, page: n, pages: total, pct: pct(0.4) });
    const lines = layoutRuns(runs, vp.width);
    const text = lines.map((l) => l.text).join('\n');
    let source: ExtractedPage['source'] = 'text';
    let note: string | undefined;
    if (!usableText(text).usable) {
      source = 'unreadable';
      note = `Page ${n} has no selectable text (it is probably scanned). Scanned pages need OCR, which this browser-only version can’t run. Type or paste this page’s text below.`;
    } else {
      const images = await imageBoxes(page, OPS, vp.height);
      const scanned = images.filter((b) => area(b) > 0.04 * vp.width * vp.height && b.w > 0.3 * vp.width &&
        lines.filter((l) => overlapArea(l.box, b) > 0.5 * area(l.box)).length === 0);
      if (scanned.length) note = `Page ${n} also contains a scanned image. If it lists skills or projects, add that text below.`;
    }
    pages.push({ page: n, width: vp.width, height: vp.height, lines: source === 'unreadable' ? [] : lines, text: source === 'unreadable' ? '' : text, source, confidence: source === 'unreadable' ? 0 : 100, note });

    onProgress({ message: `Rendering a preview of page ${n}`, page: n, pages: total, pct: pct(0.7) });
    try {
      const scale = 110 / 72;
      const v = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(v.width);
      canvas.height = Math.ceil(v.height);
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, canvas, viewport: v }).promise;
      previews.push(canvas.toDataURL('image/png'));
    } catch {
      previews.push('');
    }
    page.cleanup();
  }
  await task.destroy();
  for (const p of pages) if (p.source === 'unreadable') warnings.push(p.note!);
  onProgress({ message: 'Done', pct: 100 });
  return { pages, previews, warnings, ms: Math.round(performance.now() - t0) };
}

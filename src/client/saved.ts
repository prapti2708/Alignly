// Saved analyses: only created when the student clicks "Save to dashboard". They hold the JD and the
// resume text (not the PDF), in this browser only, under the signed-in account.
import { analyze } from '../engine/analyze.ts';
import { buildPlan } from '../engine/plan.ts';
import type { ExtractedPage } from '../server/layout.ts';
import { getJSON, setJSON, removeItem } from './storage.ts';

export interface SavedAnalysis {
  id: string;
  createdAt: number;
  title: string;
  resumeName: string;
  jd: string;
  pages: ExtractedPage[];
}

const key = (userId: string) => `alignly:analyses:${userId}`;

export function listSaved(userId: string): SavedAnalysis[] {
  return getJSON<SavedAnalysis[]>(key(userId), []).sort((a, b) => b.createdAt - a.createdAt);
}

export function saveAnalysis(userId: string, input: { jd: string; pages: ExtractedPage[]; resumeName: string }): SavedAnalysis {
  const title = input.jd.split('\n').map((l) => l.trim()).find(Boolean)?.slice(0, 90) || 'Untitled role';
  // Keep text and line boxes; drop nothing the analysis needs. Page previews are not stored.
  const pages = input.pages.map((p) => ({ ...p, lines: [] }));
  const item: SavedAnalysis = { id: Math.random().toString(36).slice(2, 10), createdAt: Date.now(), title, resumeName: input.resumeName, jd: input.jd, pages };
  setJSON(key(userId), [item, ...listSaved(userId)]);
  return item;
}

export function deleteSaved(userId: string, id: string) {
  setJSON(key(userId), listSaved(userId).filter((x) => x.id !== id));
}

export function deleteAllSaved(userId: string) {
  for (const s of listSaved(userId)) removeItem(`alignly:plan:${planSignature(s)}`);
  removeItem(key(userId));
}

/** Re-runs the analysis from saved text, so results always use the current engine. */
export function summarize(s: SavedAnalysis) {
  const a = analyze(s.jd, s.pages);
  const plan = buildPlan(a.topGaps);
  const done = getJSON<Record<number, boolean>>(`alignly:plan:${planSignatureFromPlan(plan)}`, {});
  const doneCount = plan.days.filter((d) => done[d.day]).length;
  const next = plan.days.find((d) => !done[d.day]);
  return { analysis: a, plan, doneCount, next, pct: a.counts.counted ? Math.round((a.counts.matched / a.counts.counted) * 100) : 0 };
}

export const planSignatureFromPlan = (plan: { gaps: { skillId: string }[] }) => (plan.gaps.length ? plan.gaps.map((g) => g.skillId).join('+') : 'none');
const planSignature = (s: SavedAnalysis) => planSignatureFromPlan(buildPlan(analyze(s.jd, s.pages).topGaps));

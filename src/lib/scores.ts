/** Rounds and clamps a fit score into an integer 0-100. Non-finite values become 0. */
export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

/**
 * Clamps every fitScore, drops duplicate ids (keeping the first), sorts by score
 * descending (stable for ties) and caps the list length.
 */
export function normalizeScored<T extends { id: string; fitScore: number }>(items: T[], limit = Infinity): T[] {
  const seen = new Set<string>();
  const unique: T[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    unique.push({ ...item, fitScore: clampScore(item.fitScore) });
  }
  return unique.sort((a, b) => b.fitScore - a.fitScore).slice(0, limit);
}

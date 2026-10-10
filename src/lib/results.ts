export function responseRate(responses: number, impressions: number): number | null {
  if (!Number.isFinite(responses) || !Number.isFinite(impressions) || impressions <= 0) return null;
  return responses / impressions;
}

export function formatRate(rate: number | null): string {
  return rate === null ? "n/a" : `${(rate * 100).toFixed(1)}%`;
}

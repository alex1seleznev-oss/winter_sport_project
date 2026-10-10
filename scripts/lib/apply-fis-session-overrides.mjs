export function applyReviewedFisOverrides(stage, reviewSet) {
  if (!stage || !reviewSet || !Array.isArray(reviewSet.reviews)) return stage;
  const reviews = reviewSet.reviews.filter(review => String(review.eventId) === String(stage.eventId));
  if (reviews.length === 0) return stage;
  if (reviews.length !== 1) throw new Error('FIS_REVIEW_OVERRIDE_AMBIGUOUS');

  const review = reviews[0];
  if (!Array.isArray(review.changes) || review.changes.length === 0) throw new Error('FIS_REVIEW_OVERRIDE_EMPTY');
  const rows = stage.rows.map(row => ({...row}));
  const seen = new Set();

  for (const change of review.changes) {
    const key = `${change.codex}:${change.raceId}`;
    if (seen.has(key)) throw new Error('FIS_REVIEW_OVERRIDE_DUPLICATE');
    seen.add(key);
    const matches = rows.filter(row => row.codex === change.codex && row.raceId === change.raceId);
    if (matches.length !== 1) throw new Error('FIS_REVIEW_OVERRIDE_IDENTITY_MISMATCH');
    const row = matches[0];
    if (row.date !== change.fromDate) throw new Error('FIS_REVIEW_OVERRIDE_PRIOR_STATE_MISMATCH');
    if (!/^20\d\d-\d\d-\d\d$/.test(change.toDate)) throw new Error('FIS_REVIEW_OVERRIDE_DATE_INVALID');
    row.date = change.toDate;
  }

  return {
    ...stage,
    rows,
    reviewOverride: {
      reviewedAt: review.reviewedAt,
      evidenceRun: review.evidenceRun,
      reason: review.reason,
      changeCount: review.changes.length
    }
  };
}

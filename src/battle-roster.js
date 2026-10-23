import { BATTLE_ROSTERS } from './battle-roster-data.js?rev=58';

export const BATTLE_ROUND_IDS = Object.freeze(['selection','round-2','round-3','round-4','round-5','final']);

export function battleRoster(roundId) {
  return Object.hasOwn(BATTLE_ROSTERS,roundId) ? structuredClone(BATTLE_ROSTERS[roundId]) : null;
}

/** Rank completed entries only. A cut-off tie remains a domain decision, not an alphabetical win. */
export function rankSelection(entries, results, {limit=32}={}) {
  if (!Number.isInteger(limit) || limit < 1) throw new RangeError('Positive selection limit required');
  const ids = [...new Set(entries.map(e => e.id))];
  const scores = new Map();
  for (const r of results) {
    if (scores.has(r.entryId)) throw new Error('Duplicate selection result: ' + r.entryId);
    scores.set(r.entryId,r.raw);
  }
  const pendingIds = ids.filter(id => !Number.isFinite(scores.get(id))).sort();
  const ranked = ids.filter(id => Number.isFinite(scores.get(id)))
    .sort((a,b) => scores.get(b)-scores.get(a) || a.localeCompare(b));
  const cut = ranked[limit-1];
  const boundaryTie = cut !== undefined && ranked.length > limit && scores.get(cut) === scores.get(ranked[limit]);
  const tiedAtBoundary = boundaryTie ? ranked.filter(id => scores.get(id) === scores.get(cut)).sort() : [];
  const qualifiedIds = boundaryTie ? ranked.filter(id => scores.get(id) > scores.get(cut)) : ranked.slice(0,limit);
  return {qualifiedIds,tiedAtBoundary,pendingIds};
}

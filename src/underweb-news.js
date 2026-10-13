import { UNDERWEB_NEWS } from './underweb-news-data.js?rev=40';

// Game day one is 2012-09-01. Invalid host metadata must never unlock the future.
const validDay = value => typeof value === 'number' && Number.isFinite(value) && value >= 1 ? Math.floor(value) : 1;
const EPOCH = Date.UTC(2012, 8, 1);
const publications = UNDERWEB_NEWS.map(issue => ({
  day: Math.round((Date.parse(issue.publishDate + 'T00:00:00Z') - EPOCH) / 86400000) + 1,
  issue: Object.freeze({ ...issue, body: Object.freeze([...issue.body]) }),
}));
const byId = new Map(publications.map(entry => [entry.issue.id, entry]));

/** Current issue persists between releases and after the historical archive ends. */
export function newsForDay(gameDay) {
  const day = validDay(gameDay);
  for (let i = publications.length - 1; i >= 0; i--) {
    if (publications[i].day <= day) return publications[i].issue;
  }
  return null;
}

/** Direct article URLs obey exactly the same date gate as the front page. */
export function newsIssue(id, gameDay) {
  const entry = byId.get(id);
  return entry && entry.day <= validDay(gameDay) ? entry.issue : null;
}

/** Fresh array; its immutable items can safely be shared by views and search. */
export function archiveForDay(gameDay) {
  const day = validDay(gameDay);
  return publications.filter(entry => entry.day <= day).map(entry => entry.issue).reverse();
}

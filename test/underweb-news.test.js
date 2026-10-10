import test from 'node:test';
import assert from 'node:assert/strict';
const news = await import('../src/underweb-news.js').catch(() => ({}));
test('news starts on day one and rolls only every third day', () => {
  assert.equal(typeof news.newsForDay, 'function');
  assert.equal(news.newsForDay(1).publishDate, '2012-09-01');
  assert.equal(news.newsForDay(3).id, news.newsForDay(1).id);
  assert.equal(news.newsForDay(4).publishDate, '2012-09-04');
  assert.equal(news.newsForDay(7).publishDate, '2012-09-07');
  assert.equal(news.newsForDay(367).publishDate, '2013-09-02');
});
test('all three-day release slots exist for the two-year archive', () => {
  assert.equal(typeof news.archiveForDay, 'function');
  const rows = news.archiveForDay(731);
  assert.equal(rows.length, 244);
  assert.equal(rows[0].publishDate, '2014-08-31');
  assert.equal(rows.at(-1).publishDate, '2012-09-01');
  assert.equal(new Set(rows.map(row => row.id)).size, rows.length);
  assert.equal(new Set(rows.map(row => row.title)).size, rows.length);
  rows.forEach((row, i) => {
    if (i) assert.equal(Date.parse(rows[i-1].publishDate)-Date.parse(row.publishDate),259200000);
    assert.match(row.eventDate,/^20\d{2}-\d{2}-\d{2}$/);
    assert.ok(Date.parse(row.eventDate)<=Date.parse(row.publishDate));
    assert.ok(Date.parse(row.publishDate)-Date.parse(row.eventDate)<=14*86400000,row.id);
    assert.ok(row.sourceTitle && row.category && row.title);
    const url = new URL(row.sourceUrl);
    assert.equal(url.protocol,'https:');
    assert.ok(!/search|google\./i.test(url.pathname+url.hostname));
    assert.ok(row.body.length>=1 && row.body.every(p=>typeof p==='string' && p.trim().length>15));
  });
  assert.ok(new Set(rows.map(row=>row.category)).size>=5);
});
test('archive and direct issue lookup cannot expose a later publication', () => {
  assert.equal(typeof news.newsIssue,'function');
  const later=news.newsForDay(4);
  assert.equal(news.newsIssue(later.id,3),null);
  assert.equal(news.newsIssue(later.id,4).id,later.id);
  assert.equal(news.archiveForDay(3).length,1);
  assert.equal(news.archiveForDay(4).length,2);
  assert.equal(news.newsIssue('missing',731),null);
  assert.equal(news.newsIssue('__proto__',731),null);
});
test('malformed dates cannot unlock archive and fractional days use current day', () => {
  assert.equal(typeof news.newsForDay,'function');
  for (const day of [undefined,null,NaN,Infinity,-Infinity,-2,0,{},[],'731']) {
    assert.equal(news.newsForDay(day).publishDate,'2012-09-01');
    assert.equal(news.archiveForDay(day).length,1);
  }
  assert.equal(news.newsForDay(3.99).publishDate,'2012-09-01');
});
test('finished archive stays stable and consumer mutation cannot change later reads', () => {
  assert.equal(typeof news.newsForDay,'function');
  assert.deepEqual(news.newsForDay(1000000),news.newsForDay(731));
  assert.equal(news.archiveForDay(1000000).length,244);
  const first=news.newsForDay(1),saved=JSON.stringify(first);
  try {first.title='changed';first.body[0]='changed';} catch {}
  news.archiveForDay(1).pop();
  assert.equal(JSON.stringify(news.newsForDay(1)),saved);
  assert.equal(news.archiveForDay(1).length,1);
});
test('historical corrections preserve announcement, regional and episodic distinctions', () => {
  const row = date => news.newsIssue(`news-${date}`,731);
  assert.equal(row('2012-10-13').category,'Наука');
  assert.equal(row('2012-10-13').eventDate,'2012-10-10');
  assert.equal(row('2012-12-06').eventDate,'2012-11-29');
  assert.match(row('2012-12-06').body.join(' '),/Европы и Азии/);
  assert.match(row('2013-11-07').body.join(' '),/раннего доступа/);
  assert.match(row('2014-01-30').body.join(' '),/первый акт/);
  assert.match(row('2013-10-11').body.join(' '),/первый эпизод/);
  assert.equal(row('2014-08-13').eventDate,'2014-08-13');
  assert.equal(row('2012-12-30').eventDate,'2012-12-20');
  assert.ok(row('2013-03-27').sourceUrl.startsWith('https://ir.take2games.com/'));
});
test('every release remains date-gated and deterministic after module reload', async () => {
  const reload = await import('../src/underweb-news.js?news-reload-test');
  for (let index=0;index<244;index++) {
    const day=1+index*3;
    const issue=news.newsForDay(day);
    assert.deepEqual(reload.newsForDay(day),issue);
    assert.equal(news.archiveForDay(day).length,index+1);
    if (index) assert.equal(news.newsIssue(issue.id,day-1),null);
  }
});

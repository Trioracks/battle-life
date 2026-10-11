import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveUnderweb} from '../src/virtual-pc-catalog.js';
test('historical archive addresses resolve separately, validate sections and date-gate topics',()=>{
 assert.equal(resolveUnderweb('underweb://forum/archive',{gameDay:1}).type,'forum-archive');
 assert.equal(resolveUnderweb('underweb://forum/archive?board=official-battle',{gameDay:1}).archiveBoardId,'official-battle');
 assert.equal(resolveUnderweb('underweb://forum/archive?board=unknown',{gameDay:1}).type,'error');
 const topic=resolveUnderweb('underweb://forum/archive/topic/repac-winner?page=2',{gameDay:1});assert.equal(topic.type,'forum-archive-topic');assert.equal(topic.archiveTopicId,'repac-winner');assert.equal(topic.page,2);
 assert.equal(resolveUnderweb('underweb://forum/archive/topic/albums-2012',{gameDay:60}).type,'error');
 assert.equal(resolveUnderweb('underweb://forum/archive/topic/albums-2012',{gameDay:61}).type,'forum-archive-topic');
 assert.equal(resolveUnderweb('underweb://forum/archive/extra',{gameDay:1}).type,'error');
});
test('Iskra indexes only date-visible historical topics with explicit archive provenance',()=>{
 const early=resolveUnderweb('RE-pac',{gameDay:1});assert.ok(early.results.some(r=>r.url.includes('/archive/topic/repac-winner')&&r.site.includes('Hip-Hop.ru')));
 assert.ok(!resolveUnderweb('альбомы 2012',{gameDay:1}).results.some(r=>r.url.includes('/archive/topic/albums-2012')));
 assert.ok(resolveUnderweb('альбомы 2012',{gameDay:61}).results.some(r=>r.url.includes('/archive/topic/albums-2012')));
});

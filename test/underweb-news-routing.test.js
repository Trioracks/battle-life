import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveUnderweb} from '../src/virtual-pc-catalog.js?rev=27';
import {newsForDay,archiveForDay} from '../src/underweb-news.js?rev=27';
import {mountUnderweb} from '../src/underweb-view.js?rev=27';
import {pcDocument,findButton,allPc} from './helpers/virtual-pc-dom.js';
test('news articles and archive resolve locally with the current game date',()=>{
 const first=newsForDay(1),article=resolveUnderweb('underweb://iskra/news/'+first.id,{gameDay:1});assert.equal(article.type,'news');assert.deepEqual(article.issue,first);
 const archive=resolveUnderweb('underweb://iskra/archive',{gameDay:1});assert.equal(archive.type,'news-archive');assert.deepEqual(archive.issues,archiveForDay(1));
 assert.equal(resolveUnderweb('underweb://iskra/news/news-2012-09-04',{gameDay:1}).type,'error');
});
test('news search exposes the first release without any future publication',()=>{
 const first=newsForDay(1),found=resolveUnderweb(first.title,{gameDay:1}).results;assert.ok(found.some(r=>r.url==='underweb://iskra/news/'+first.id));
 const published=new Set(archiveForDay(1).map(i=>i.id));assert.ok(found.filter(r=>r.url.startsWith('underweb://iskra/news/')).every(r=>published.has(r.url.split('/').at(-1))));
});
test('Iskra home connects the current headline to an article and past archive',()=>{
 const d=pcDocument(),root=d.createElement('div'),state={};const view=mountUnderweb(root,{getState:()=>state,getMetadata:()=>({gameDay:1,playerName:'Тест'}),onChange(){}});
 const title=newsForDay(1).title,headline=findButton(root,title);assert.ok(headline);headline.click();assert.equal(view.snapshot.route.type,'news');assert.ok(allPc(root).some(n=>n.tagName==='A'));
 findButton(root,'Архив выпусков →').click();assert.equal(view.snapshot.route.type,'news-archive');assert.equal(allPc(root).some(n=>n.tagName==='A'),false);view.dispose();
});

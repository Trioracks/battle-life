import test from 'node:test';
import assert from 'node:assert/strict';
import {pcDocument,allPc,findButton} from './helpers/virtual-pc-dom.js';
import * as view from '../src/underweb-news-view.js?rev=28';
import {mountUnderweb} from '../src/underweb-view.js';
import {submissionFixture} from './helpers/submission-fixtures.js';

test('Iskra places news before directory and only registered battles in sidebar',()=>{
 const d=pcDocument(),root=d.createElement('section'),state=submissionFixture();
 const browser=mountUnderweb(root,{getState:()=>state,getMetadata:()=>({gameDay:1}),onChange(){}});
 const nodes=allPc(root),side=nodes.find(n=>n.getAttribute('aria-label')==='Мои баттлы');assert.ok(side);
 assert.ok(findButton(side,'Макаревич Батл №1'));assert.equal(findButton(side,'Бетонное эхо'),undefined);
 assert.ok(nodes.findIndex(n=>n.className==='uw-news-panel')<nodes.findIndex(n=>n.className==='uw-home-directory'));
 assert.ok(!nodes.some(n=>n.textContent?.includes('Без ИИ')));findButton(side,'Макаревич Батл №1').click();assert.equal(browser.snapshot.route.brief.id,'makarevich-1');
});
const issue={id:'fixture-only',publishDate:'2012-09-04',eventDate:'2012-09-02',title:'Проверочная новость',body:['Текст для проверки отображения.','<script>not executable</script>'],category:'Техника',sourceTitle:'Источник',sourceUrl:'https://example.com/source'};
test('Iskra news panel shows distinct issue and event dates and navigates to a local article',()=>{
 assert.equal(typeof view.createNewsPanel,'function');const d=pcDocument();let address='';const panel=view.createNewsPanel(d,{issue,navigate:value=>address=value});
 assert.ok(allPc(panel).some(n=>n.textContent?.includes('04.09.2012')));assert.ok(allPc(panel).some(n=>n.textContent?.includes('02.09.2012')));
 findButton(panel,issue.title).click();assert.equal(address,'underweb://iskra/news/fixture-only');findButton(panel,'Архив выпусков →').click();assert.equal(address,'underweb://iskra/archive');
});
test('local news article keeps body inert and exposes the exact attributed external source',()=>{
 assert.equal(typeof view.createNewsPage,'function');const d=pcDocument(),page=view.createNewsPage(d,{route:{type:'news',issue},navigate(){}});
 assert.ok(allPc(page).some(n=>n.textContent==='<script>not executable</script>'));assert.equal(allPc(page).some(n=>n.tagName==='SCRIPT'),false);
 const source=allPc(page).find(n=>n.tagName==='A');assert.equal(source.getAttribute('href'),'https://example.com/source');assert.equal(source.getAttribute('target'),'_blank');assert.equal(source.getAttribute('rel'),'noopener noreferrer');assert.equal(source.getAttribute('tabindex'),'0');
});
test('news archive links only the releases passed by the dated model',()=>{
 assert.equal(typeof view.createNewsPage,'function');const d=pcDocument();let address='';const page=view.createNewsPage(d,{route:{type:'news-archive',issues:[issue]},navigate:value=>address=value});
 findButton(page,issue.title).click();assert.equal(address,'underweb://iskra/news/fixture-only');assert.equal(allPc(page).filter(n=>n.tagName==='A').length,0);
});

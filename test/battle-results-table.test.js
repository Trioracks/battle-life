import test from 'node:test';
import assert from 'node:assert/strict';
import {publicRoundTable} from '../src/battle-results-table.js';
import {createBattleResultsTableView} from '../src/battle-results-table-view.js';
import {tableFixture} from './helpers/tournament-table-fixture.js';
import {pcDocument,allPc,findButton} from './helpers/virtual-pc-dom.js';
import {resolveSocialRoute} from '../src/social-routing.js';
import {mountUnderweb} from '../src/underweb-view.js';
import {createSocialResultView} from '../src/social-result-view.js';
const options={battleId:'makarevich-1',roundId:'selection',nowMinute:12000,viewerId:'player'};
test('public scoring rules disclose selection scale independently of roster and only for public supported rounds',()=>{
 const s=tableFixture(),t=s.tournaments.byId[options.battleId];
 assert.deepEqual(publicRoundTable(s,options).scoring,{mode:'score',scale:50});
 assert.equal(publicRoundTable(s,{...options,nowMinute:599}).scoring,null);
 t.rounds['round-2']={...t.rounds.selection,roundId:'round-2',opensAt:13000,pairs:[]};
 assert.equal(publicRoundTable(s,{...options,roundId:'round-2'}).scoring,null);
 assert.deepEqual(publicRoundTable(s,{...options,roundId:'round-2',nowMinute:13000}).scoring,{mode:'comparison',scale:null});
 s.tournaments.byId['concrete-echo']={...t,battleId:'concrete-echo'};
 assert.equal(publicRoundTable(s,{...options,battleId:'concrete-echo'}).scoring,null);
 const d=pcDocument(),host=d.createElement('main'),browser=mountUnderweb(host,{getState:()=>s,getMetadata:()=>({gameMinutes:12000,gameDay:9}),onChange:()=>true});
 browser.navigate('underweb://battles/makarevich-1/rules');const text=allPc(host).map(n=>n.textContent).join(' ');assert.match(text,/5 оценок.*10 баллов.*50 баллов/);browser.dispose();
});
test('public table reveals only due reviews, hero always and qualifiers only after completed panel',()=>{
 const s=tableFixture(),early=publicRoundTable(s,{...options,nowMinute:11500});assert.equal(early.complete,false);assert.equal(early.rows.find(r=>r.participantId==='player').reviews.length,2);assert.equal(early.rows.filter(r=>r.masked).length,2);assert.ok(early.rows.every(r=>r.total===null));
 const done=publicRoundTable(s,options);assert.equal(done.complete,true);assert.equal(done.rows.find(r=>r.participantId==='mak-npc-01').name.length>0,true);assert.equal(done.rows.filter(r=>r.masked).length,1);
 const hidden=done.rows.find(r=>r.masked);assert.equal(hidden.participantId,undefined);assert.equal(hidden.trackVersionId,undefined);assert.equal(hidden.reviews.length,0);
 assert.equal(done.awards.length,3);assert.ok(done.awards.every(a=>a.name&&a.profileUrl===null));
 assert.ok(!/rawScore|personalQuality|knownFacts|private|skills/.test(JSON.stringify(done)));assert.equal(publicRoundTable(s,{...options,nowMinute:599}).rows.length,0);
});
test('double no-show shows both known names in red, no zero grades, same history after reload',()=>{
 const s=tableFixture(),t=s.tournaments.byId[options.battleId],r={...t.rounds.selection,id:'makarevich-1:round-2:1',roundId:'round-2',opensAt:13440,closesAt:23520,completedAt:24500,submissions:{},judgeBatches:{},pairs:[{nodeId:'node-r-0',participantIds:['player','mak-npc-01'],technical:{kind:'double_no_show',winnerId:null},winnerId:null}],status:'complete'};t.rounds['round-2']=r;t.currentRoundId='round-2';
 const table=publicRoundTable(s,{...options,roundId:'round-2',nowMinute:24500});assert.equal(table.rows.length,2);for(const row of table.rows){assert.equal(row.status,'no_show');assert.equal(row.tone,'danger');assert.equal(row.total,null);assert.ok(row.name);assert.ok(row.scores.every(s=>s.value===null));}
 assert.deepEqual(publicRoundTable(JSON.parse(JSON.stringify(s)),{...options,roundId:'round-2',nowMinute:24500}),table);
});
test('table view exposes public results without Study controls and returns to community',()=>{
 const d=pcDocument(),table=publicRoundTable(tableFixture(),options),requests=[],root=createBattleResultsTableView(d,{table,navigate:()=>{},onAnalyze:r=>requests.push(r)});assert.equal(findButton(root,'Изучить: Герой'),undefined);assert.equal(requests.length,0);
 const text=allPc(root).map(n=>n.textContent).join(' ');assert.ok(!text.includes('8.59'));assert.ok(text.includes('LTR'));
 const address='underweb://social/results/makarevich-1/selection';assert.equal(resolveSocialRoute(address).section,'results');assert.equal(resolveSocialRoute(address+'/extra'),null);
 const host=d.createElement('div');let state=tableFixture();const browser=mountUnderweb(host,{getState:()=>state,getMetadata:()=>({gameMinutes:12000,gameDay:9}),onChange:s=>{state=s;return true;}});browser.navigate(address);assert.ok(findButton(host,'← Группа'));findButton(host,'← Группа').click();assert.equal(browser.snapshot.route.section,'community');browser.dispose();
});
test('community hero panel uses binary votes rather than out-of-ten grades in a pair',()=>{
 const s=tableFixture(),submission={id:'pair-submit',battleId:options.battleId,roundId:'round-2',windowId:'pair-window',playerId:'player',trackVersionId:'track:player'};s.battleSubmissions=[submission];s.battleWindows=[{id:'pair-window',judgeIds:['eparhiya']}];const review=s.judging.results['player:eparhiya'];review.roundId='round-2';review.decision={kind:'pair_vote',winnerId:'track:player'};
 s.socialRuntime.events=[{id:'r',type:'judge-review',entityId:submission.id,resultId:review.id,dueAt:1},{id:'p',type:'judge-panel-complete',entityId:submission.id,total:1,qualification:'qualified',dueAt:2}];
 const d=pcDocument(),view=createSocialResultView(d,{submission,getState:()=>s,commit:()=>true,expandedResults:new Set(['p'])}),text=allPc(view).map(n=>n.textContent).join(' ');assert.ok(text.includes('1 голос'));assert.ok(!text.includes('/ 10'));assert.ok(text.includes('Голоса: 1 / 1'));
});
test('table pages preserve every score and local player position across remounts',()=>{
 const d=pcDocument(),table=publicRoundTable(tableFixture(),options),uiState={page:0,rowsPerPage:2};table.rows=[...table.rows.slice(1),table.rows[0]];const original=structuredClone(table);
 let root=createBattleResultsTableView(d,{table,navigate(){},uiState});const rows=()=>allPc(root).filter(n=>n.className?.startsWith('bt-row '));assert.equal(rows().length,2);assert.equal(allPc(rows()[0]).filter(n=>n.tagName==='TD').length,table.judges.length+3);
 findButton(root,'К моему месту').click();assert.equal(uiState.page,1);assert.ok(allPc(rows()[0]).some(n=>n.textContent==='Герой'));assert.deepEqual(allPc(rows()[0]).filter(n=>n.dataset?.judgeScore).map(n=>n.children[0]?.textContent??n.textContent),['8','8','8']);
 root.dispose?.();root=createBattleResultsTableView(d,{table,navigate(){},uiState});assert.equal(uiState.page,1);assert.equal(rows().length,1);findButton(root,'Предыдущая страница').click();assert.equal(uiState.page,0);assert.equal(rows().length,2);assert.deepEqual(table,original);root.dispose?.();
});
test('background social changes preserve focus on the player-place control',()=>{
 const d=pcDocument(),root=d.createElement('main');let state=tableFixture();const browser=mountUnderweb(root,{getState:()=>state,getMetadata:()=>({gameMinutes:12000,gameDay:9}),onChange:s=>{state=s;return true;}});browser.navigate('underweb://social/results/makarevich-1/selection');findButton(root,'К моему месту').focus();state={...state,social:{...state.social,audienceCount:state.social.audienceCount+1}};browser.update();assert.equal(d.activeElement?.textContent,'К моему месту');browser.dispose();
});

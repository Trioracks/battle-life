import assert from 'node:assert/strict';

// Bounded supplement to the retained live-week evidence. No clock jump, seeded
// future round, domain stub, forced board refresh or synthetic Worker reply.
export async function verifyWeekplayTransition({page,base,out,evaluate,milestone}){
 const result={mode:'native-natural-clock-transition',shots:[]};
 result.fixture=await evaluate(async()=>{
  const [{dossierTransitionFixture},saves,profile]=await Promise.all([import('/test/helpers/dossier-transition-fixture.js'),import('/src/virtual-pc-state.js?rev=43'),import('/src/avatar-v3-profile.js?rev=43')]);
  const state=dossierTransitionFixture();
  if(!saves.saveVirtualPcState(localStorage,state)||!profile.saveProfile(localStorage,profile.createProfile({name:'Проверка перехода'})).ok)throw Error('transition fixture save');
  localStorage.setItem('battle-life-apartment-v3-time',JSON.stringify({day:10,minutes:470,initialRest:false}));
  return {rounds:Object.keys(state.tournaments.byId['makarevich-1'].rounds),nextRoundAt:state.tournaments.byId['makarevich-1'].nextRoundAt,hasFutureTheme:Boolean(state.roundThemes['makarevich-1:round-2'])};
 });
 assert.deepEqual(result.fixture,{rounds:['selection'],nextRoundAt:13440,hasFutureTheme:false});
 await page.goto(base);await page.locator('#loading').waitFor({state:'hidden'});await page.locator('#continue-game').click();await page.waitForFunction(()=>weekQA.phase==='room'&&!weekQA.background.busy);
 await page.locator('#apartment').focus();await page.keyboard.press('Enter');await page.locator('#actions [data-action=computer]').click();await page.waitForFunction(()=>weekQA.phase==='desktop');
 await evaluate(()=>{weekQA.pc.open('rap-dossier');weekQA.pc.dossierView.focusTarget({caseId:'battle:makarevich-1'});window.transitionMountedView=document.querySelector('.rap-dossier');});
 const round=page.locator('[data-dossier-node="round:makarevich-1:round-2"]'),opponent=page.locator('[data-dossier-node="opponent:mak-npc-01"]');
 result.before=await evaluate(()=>({minute:weekQA.minute,now:performance.now(),rounds:Object.keys(weekQA.state.tournaments.byId['makarevich-1'].rounds),background:weekQA.background,cards:[...document.querySelectorAll('[data-dossier-node]')].map(n=>n.dataset.dossierNode),pcmRequests:qaResources.pcmRequests}));
 assert.ok(result.before.minute<13440);assert.deepEqual(result.before.rounds,['selection']);assert.equal(await round.count(),0);assert.equal(await opponent.count(),0);
 const capture=async name=>{const path=out+'/'+name+'.png';await page.screenshot({path});result.shots.push(path);};
 await capture('before-round-publication');await milestone('Mounted board before real round publication',result.before);
 await page.waitForFunction(()=>document.querySelector('[data-dossier-node="round:makarevich-1:round-2"]')&&document.querySelector('[data-dossier-node="opponent:mak-npc-01"]'),{},{timeout:60000});
 result.after=await evaluate(async()=>{
  const {publicDossierCase}=await import('/src/rap-dossier-cases.js?rev=43'),s=weekQA.state,t=s.tournaments.byId['makarevich-1'];
  return {minute:weekQA.minute,now:performance.now(),rounds:Object.keys(t.rounds),currentRoundId:t.currentRoundId,announcement:t.events.find(e=>e.type==='round-announced'&&e.roundId==='round-2'),background:weekQA.background,sameMountedView:transitionMountedView===document.querySelector('.rap-dossier'),cards:[...document.querySelectorAll('[data-dossier-node]')].map(n=>n.dataset.dossierNode),graph:publicDossierCase(s,{caseId:'battle:makarevich-1',nowMinute:weekQA.minute}),cutoffGraph:publicDossierCase(s,{caseId:'battle:makarevich-1',nowMinute:13439}),pcmRequests:qaResources.pcmRequests};
 });
 assert.equal(result.after.currentRoundId,'round-2');assert.equal(result.after.announcement.dueAt,13440);assert.equal(result.after.sameMountedView,true);assert.equal(result.after.background.error,'');assert.ok(result.after.background.commits>result.before.background.commits);
 assert.ok(result.after.minute>=13440);assert.ok(result.after.now>result.before.now);assert.equal(result.after.pcmRequests,result.before.pcmRequests);
 assert.ok(!result.after.cutoffGraph.nodes.some(n=>n.roundId==='round-2'||n.kind==='opponent'));
 assert.ok(!result.after.graph.edges.some(e=>e.kind==='judge'&&e.from==='round:makarevich-1:round-2'));
 for(const secret of ['qualities','heroSkillSnapshot','knownFacts','weights','recoveryData'])assert.ok(!JSON.stringify(result.after.graph).includes('"'+secret+'"'));
 assert.equal(await round.isVisible(),true);assert.equal(await opponent.isVisible(),true);
 await round.click();assert.equal(await page.locator('.rd-detail').getByRole('button',{name:'Изучить раунд · 6 ч',exact:true}).isVisible(),true);await capture('after-round-publication-1280');
 await page.locator('.rd-detail').getByRole('button',{name:'Открыть источник',exact:true}).click();
 result.roundNavigation={window:await evaluate(()=>weekQA.pc.window),address:await page.getByRole('textbox',{name:'Адрес или поиск Underweb',exact:true}).inputValue()};assert.deepEqual(result.roundNavigation,{window:'underweb',address:'underweb://social/results/makarevich-1/round-2'});
 await capture('published-round-source');
 await evaluate(()=>{weekQA.pc.closeWindow('underweb');weekQA.pc.open('rap-dossier');});await opponent.click();
 await capture('after-opponent-publication-1280');
 await page.locator('.rd-detail').getByRole('button',{name:'Открыть профиль',exact:true}).click();
 result.opponentNavigation={window:await evaluate(()=>weekQA.pc.window),address:await page.getByRole('textbox',{name:'Адрес или поиск Underweb',exact:true}).inputValue()};assert.deepEqual(result.opponentNavigation,{window:'underweb',address:'underweb://social/profile/mak-npc-01'});
 await capture('published-opponent-profile');
 await evaluate(()=>{weekQA.pc.closeWindow('underweb');weekQA.pc.open('rap-dossier');});await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Вписать доску',exact:true}).click();
 assert.equal(await evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await capture('after-round-publication-390');
 result.dispose=await evaluate(()=>{weekQA.dispose();return weekQA.resources();});for(const key of ['observers','workers','intervals','rows','sources'])assert.equal(result.dispose[key],0,'disposed '+key);
 result.passed=true;await milestone('Native mounted-board round transition verified',{beforeMinute:result.before.minute,afterMinute:result.after.minute,elapsedMs:result.after.now-result.before.now,commits:result.after.background.commits-result.before.background.commits,shots:result.shots});return result;
}

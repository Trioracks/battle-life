import test from 'node:test';
import assert from 'node:assert/strict';
import {mountVirtualPc} from '../src/virtual-pc-ui.js';
import {createVirtualPcState,saveVirtualPcState,loadVirtualPcState} from '../src/virtual-pc-state.js';
import {resolveUnderweb} from '../src/virtual-pc-catalog.js';
import {createStudioProject} from '../src/ft-studio-project.js';
import {pcDocument,allPc,findButton,fire} from './helpers/virtual-pc-dom.js';

function setup(seed={}){
 const d=pcDocument(),root=d.createElement('section'),timers=new Map();let id=0;
 const pc=mountVirtualPc(root,{audio:{stop(){},dispose(){}},setTimeoutFn(fn,ms){timers.set(++id,{fn,ms});return id;},clearTimeoutFn(id){timers.delete(id);}});
 pc.showDesktop(createVirtualPcState({power:'on',download:{status:'installed'},...seed}));
 return {d,root,pc,timers,finish(){for(const [id,t]of [...timers]){timers.delete(id);t.fn();}}};
}

test('FT launches once after 2.5 seconds, exposes busy feedback, then the studio workspace',()=>{
 const s=setup();s.pc.open('ft-studio');s.pc.open('ft-studio');
 assert.equal(s.pc.windows.windows.length,0,'no premature application window');
 assert.equal(s.timers.size,1);assert.equal([...s.timers.values()][0].ms,2500);
 assert.equal(s.root.getAttribute('aria-busy'),'true');
 s.finish();assert.equal(s.pc.windows.windows.length,1);assert.equal(s.root.getAttribute('aria-busy'),'false');
 const content=s.pc.shell.getContentRoot('ft-studio'),nodes=allPc(content);
 for(const label of ['Библиотека','Дорожки','Ритм'])assert.ok(nodes.some(n=>n.textContent===label));
 assert.ok(findButton(content,'Новый бит'),'production entry is now available');
 s.pc.open('underweb');s.pc.open('ft-studio');assert.equal(s.timers.size,0,'existing window restores immediately');
 assert.equal(s.pc.shell.getContentRoot('ft-studio'),content);
});

test('reset and shutdown cancel a pending FT launch without a late window',()=>{
 for(const operation of ['reset','requestShutdown','requestLeave','completeShutdown','dispose']){
  const s=setup();s.pc.open('ft-studio');const stale=[...s.timers.values()][0]?.fn;
  assert.ok(stale,'launch must be pending');
  operation==='reset'?s.pc.reset(createVirtualPcState()):s.pc[operation]();
  stale();assert.equal(s.pc.windows.windows.length,0);assert.equal(s.timers.size,0);
 }
});

test('registration stays at the application section and focuses its input after opening',()=>{
 const s=setup();s.pc.open('underweb');s.pc.navigateUnderweb('underweb://battles/concrete-echo');
 const page=allPc(s.root).find(n=>n.className==='uw-page');page.scrollTop=380;
 findButton(s.root,'Подать заявку').click();
 assert.equal(page.scrollTop,380);assert.equal(s.d.activeElement.getAttribute('aria-label'),'Имя участника');
 findButton(s.root,'Подтвердить заявку').click();assert.equal(page.scrollTop,380);
 assert.equal(s.d.activeElement.textContent,'Заявка подана');
});

test('opening and closing visual FT never rewrites or discards existing projects and draft',()=>{
 const draft=createStudioProject({id:'draft',name:'Старый черновик',battleId:'concrete-echo'}).project;
 const saved={...draft,id:'saved',name:'Сохранённый'};
 const s=setup({draft,projects:[saved]});const before=structuredClone(s.pc.state);
 s.pc.open('ft-studio');s.finish();assert.equal(s.pc.confirmClose,false);s.pc.closeWindow();
 s.pc.openProject(saved);s.finish();assert.equal(s.pc.confirmClose,false);s.pc.requestLeave();
 assert.deepEqual(s.pc.state,before);assert.equal(findButton(s.root,'Создать проект FT Studio'),undefined);
});

test('Iskra resolves relevant search results and keeps external addresses inside the game',()=>{
 assert.equal(resolveUnderweb('underweb://iskra').type,'home');
 const result=resolveUnderweb('рэп баттлы');assert.equal(result.type,'search');assert.ok(result.results.some(r=>r.url==='underweb://battles'));
 assert.ok(resolveUnderweb('Бетонное эхо').results.some(r=>r.url==='underweb://battles/concrete-echo'));
 assert.equal(resolveUnderweb('абракадабра-несуществующее').results.length,0);
 assert.equal(resolveUnderweb('https://example.com').type,'error');
});

test('long Cyrillic searches survive encoded URLs and browser history without corruption',()=>{
 const query='рэп баттлы и музыкальные программы для домашней студии';
 const result=resolveUnderweb(query);assert.equal(resolveUnderweb(result.url).query,query);
 const s=setup();s.pc.open('underweb');s.pc.navigateUnderweb(query);s.pc.navigateUnderweb('underweb://battles');
 findButton(s.root,'Назад в Underweb').click();assert.equal(s.pc.underwebView.snapshot.route.query,query);
 assert.deepEqual(s.pc.underwebView.snapshot.route.results,result.results);
});

test('keyboard Tab reaches and wraps from the scrollable FT playlist',()=>{
 const s=setup();s.pc.open('ft-studio');s.finish();
 findButton(s.root,'Закрыть окно').focus();fire(s.root,'keydown',{key:'Tab'});
 assert.equal(s.d.activeElement.getAttribute('aria-label'),'Прокрутка дорожек');
 fire(s.root,'keydown',{key:'Tab'});assert.equal(s.d.activeElement,findButton(s.root,'Новый бит'));
});

test('Underweb flows from home through search, catalogue, details and local application with history',()=>{
 const s=setup();s.pc.syncHost({playerName:'Районный',clockLabel:'20:00'});s.pc.open('underweb');
 assert.ok(allPc(s.root).some(n=>n.textContent==='Искра'));
 s.pc.navigateUnderweb('рэп баттлы');findButton(s.root,'Открыть: Каталог рэп-баттлов').click();
 findButton(s.root,'Подробнее: Бетонное эхо').click();
 assert.equal(s.pc.underwebView.snapshot.route.type,'battle');
 findButton(s.root,'Подать заявку').click();
 findButton(s.root,'Подтвердить заявку').click();
 assert.equal(s.pc.state.battleApplications.length,1);assert.equal(s.pc.state.battleApplications[0].battleId,'concrete-echo');
 assert.equal(s.pc.state.battleApplications[0].nickname,'Районный');
 assert.equal(s.pc.windows.windows.some(w=>w.id==='ft-studio'),false);
 assert.ok(allPc(s.root).some(n=>n.textContent==='Заявка подана'));
 findButton(s.root,'Назад в Underweb').click();assert.equal(s.pc.underwebView.snapshot.route.type,'battles');
 findButton(s.root,'Вперёд в Underweb').click();assert.equal(s.pc.underwebView.snapshot.route.type,'battle');
 assert.equal(s.pc.state.battleApplications.length,1);
 const store=new Map(),storage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)};
 saveVirtualPcState(storage,s.pc.state);assert.deepEqual(loadVirtualPcState(storage).state.battleApplications,s.pc.state.battleApplications);
});

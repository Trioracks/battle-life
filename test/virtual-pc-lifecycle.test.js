import test from 'node:test';import assert from 'node:assert/strict';
import {mountVirtualPc} from '../src/virtual-pc-ui.js?rev=28';import {createVirtualPcState} from '../src/virtual-pc-state.js?rev=28';import {PcTransition} from '../src/virtual-pc-transition.js';import {pcDocument,allPc} from './helpers/virtual-pc-dom.js';
const {PcLifecycle}=await import('../src/virtual-pc-lifecycle.js?rev=28').catch(()=>({}));
import {readFileSync} from 'node:fs';
import {ApartmentMotion} from '../src/apartment-v3-motion.js';
import {ApartmentTime} from '../src/apartment-v3-time.js?rev=28';
import {prepareApartmentConfig,startHomeAction,advanceHomeFrame} from '../src/apartment-v3-runtime.js?rev=28';

test('accepted floor move cancels PC preparation and permits a fresh approach',async()=>{
 const {moveInRoom}=await import('../src/virtual-pc-lifecycle.js?rev=28');
 const config=prepareApartmentConfig(JSON.parse(readFileSync(new URL('../assets/apartment/v3/scene.json',import.meta.url))));
 const motion=new ApartmentMotion(config),time=new ApartmentTime();let done;
 const f=fixture(()=>new Promise(r=>done=r));
 assert.equal(startHomeAction(motion,time,'computer').allowed,true);f.life.prepare();
 assert.equal(typeof moveInRoom,'function');
 assert.equal(moveInRoom(motion,f.life,NaN),false);assert.ok(f.life.pending);
 assert.equal(moveInRoom(motion,f.life,config.spawn[0]+.3),true);
 done();await Promise.resolve();
 for(let i=0;i<180;i++)advanceHomeFrame(motion,time,1/60);
 assert.equal(motion.phase,'idle');assert.equal(motion.actionId,null);
 assert.equal(f.life.pending,null);assert.equal(f.life.snapshot.phase,'room');assert.equal(f.state.power,'off');assert.equal(f.begun,0);
 assert.equal(startHomeAction(motion,time,'computer').allowed,true);assert.equal(f.life.prepare(),true);
 const seating=f.life.seated();done();assert.equal(await seating,true);assert.equal(f.begun,1);
});

test('delayed preparation locks the invisible desktop before and after seating',async()=>{
 let done;const f=fixture(()=>new Promise(r=>done=r));
 const d=pcDocument(),root=d.createElement('section'),pc=mountVirtualPc(root,{audio:{stop(){},dispose(){}}});
 f.life.prepare();pc.showDesktop(createVirtualPcState());pc.presentTransition(f.life.snapshot);
 assert.equal(f.life.snapshot.locked,true);assert.equal(root.style.opacity,'0');assert.equal(root.style.pointerEvents,'none');
 assert.equal(root.children[0].inert,true);pc.open('computer');assert.equal(pc.windows.windows.length,0);
 const seating=f.life.seated();pc.presentTransition(f.life.snapshot);assert.equal(root.children[0].inert,true);
 done();await seating;f.life.tick(11);pc.presentTransition(f.life.snapshot);assert.equal(root.children[0].inert,false);
});

test('desktop focus is restored after removing inert, once for cold and warm entry',()=>{
 const d=pcDocument(),create=d.createElement;
 d.createElement=tag=>{const n=create(tag),focus=n.focus.bind(n);n.focus=()=>{for(let p=n;p;p=p.parentElement)if(p.inert)return;focus();};return n;};
 const root=d.createElement('section'),pc=mountVirtualPc(root,{audio:{stop(){},dispose(){}}});pc.showDesktop(createVirtualPcState());
 const t=new PcTransition();t.enter();pc.presentTransition(t.snapshot);d.activeElement=null;t.tick(11);pc.presentTransition(t.snapshot);
 assert.equal(d.activeElement?.dataset.app,'computer');
 pc.open('underweb');const input=allPc(root).find(n=>n.tagName==='INPUT');input.focus();pc.presentTransition(t.snapshot);assert.equal(d.activeElement,input,'steady frames must not steal input focus');
 t.leave();pc.presentTransition(t.snapshot);t.tick(2.4);t.enter({alreadyOn:true});pc.presentTransition(t.snapshot);d.activeElement=null;t.tick(2.4);pc.presentTransition(t.snapshot);
 assert.ok(pc.shell.getContentRoot('underweb').parentElement.contains(d.activeElement));
});
test('opaque PC screens do not repeatedly render the hidden full room',async()=>{const {pcNeedsSceneFrame}=await import('../src/virtual-pc-lifecycle.js?rev=28');assert.equal(typeof pcNeedsSceneFrame,'function');assert.equal(pcNeedsSceneFrame({overlay:1},'pc'),false);assert.equal(pcNeedsSceneFrame({overlay:.9},'pc'),true);assert.equal(pcNeedsSceneFrame({overlay:1},'game'),true);});
function fixture(prepare=async()=>{}){let state={power:'off'},room=0,begun=0;const modes={mode:'3D',yaw:1,pitch:.2},view={modes,prepareComputerView:prepare,beginComputerView(){begun++;},endComputerView(){}};const life=new PcLifecycle({view,getState:()=>state,setPower:power=>{state={power};},sounds:{play(){}},onRoom:()=>room++});return {life,modes,get state(){return state;},get begun(){return begun;},get room(){return room;}};}
test('late prepare after reset cannot enter or persist power',async()=>{assert.equal(typeof PcLifecycle,'function');let done;const f=fixture(()=>new Promise(r=>done=r));f.life.prepare();const p=f.life.seated();f.life.reset();done();await p;assert.equal(f.begun,0);assert.equal(f.state.power,'off');});
test('cold, warm, shutdown and hidden frames share one controller and safe camera restore',async()=>{assert.equal(typeof PcLifecycle,'function');const f=fixture();assert.equal(f.life.prepare(),true);assert.equal(f.life.prepare(),false);f.modes.mode='2D';await f.life.seated();assert.equal(f.state.power,'on');f.life.tick(5,{hidden:true});assert.equal(f.life.snapshot.phase,'power-on');f.life.tick(11);assert.equal(f.life.snapshot.phase,'desktop');f.life.leave();f.life.tick(2.4);assert.equal(f.room,1);f.life.restore('return-out');assert.equal(f.modes.mode,'2D');f.life.restore('return-in');assert.equal(f.modes.mode,'3D');assert.equal(f.modes.yaw,1);f.life.prepare();await f.life.seated();assert.equal(f.life.snapshot.phase,'zoom-in');f.life.tick(2.4);f.life.shutdown();assert.equal(f.state.power,'off');assert.equal(f.life.snapshot.phase,'shutdown');});
test('failed geometry returns to room and allows retry',async()=>{assert.equal(typeof PcLifecycle,'function');let failure=true;const f=fixture(async()=>{if(failure)throw Error('offline');});f.life.prepare();assert.equal(await f.life.seated(),false);assert.equal(f.state.power,'off');failure=false;assert.equal(f.life.prepare(),true);assert.equal(await f.life.seated(),true);});
test('presentation cannot persist or clear a draft or rebuild a warm app',()=>{const d=pcDocument(),root=d.createElement('section'),pc=mountVirtualPc(root,{audio:{stop(){},dispose(){}},onPersist(){throw Error('Presentation persisted');}});pc.showDesktop(createVirtualPcState());pc.open('underweb');const input=allPc(root).find(n=>n.tagName==='INPUT');input.value='Сохрани этот ввод';const before=structuredClone(pc.state);assert.equal(typeof pc.presentTransition,'function');const t=new PcTransition();t.enter({alreadyOn:true});pc.presentTransition(t.snapshot);t.tick(2.4);pc.presentTransition(t.snapshot);assert.equal(allPc(root).find(n=>n.tagName==='INPUT'),input);assert.equal(input.value,'Сохрани этот ввод');assert.deepEqual(pc.state,before);});
test('shutdown dims an opaque screen and never exposes the old desktop during zoom-out',()=>{const d=pcDocument(),root=d.createElement('section'),pc=mountVirtualPc(root,{audio:{stop(){},dispose(){}}});pc.showDesktop(createVirtualPcState({power:'off'}));pc.presentTransition({phase:'fade-out',progress:.5,zoom:1,overlay:1,locked:true});const layer=allPc(root).find(n=>n.className==='pc-transition');assert.equal(layer.style.opacity,'1');assert.equal(layer.style.filter,'brightness(0.5)');pc.presentTransition({phase:'zoom-out',progress:0,zoom:1,overlay:1,locked:true});assert.equal(layer.hidden,false);assert.equal(layer.style.filter,'brightness(0)');});

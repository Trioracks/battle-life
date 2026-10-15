import test from 'node:test';
import assert from 'node:assert/strict';
import {createPcAudioSession} from '../src/pc-audio-session.js';
import {BeatAudio} from '../src/beat-audio.js';
import {mountVirtualPc} from '../src/virtual-pc-ui.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {pcDocument,allPc} from './helpers/virtual-pc-dom.js';

const descriptor=(key='demo',id='primitive')=>({key,owner:'saved-owner',durationSeconds:32/3,parts:[{id,loopSeconds:32/3}]});
function fixture(fetchFn=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)})){
 const ctx={state:'running',currentTime:10,destination:{},sources:[],createBuffer(channels,length,rate){return {duration:length/rate,copyToChannel(){}};},createGain(){return {gain:{value:0},connect(){},disconnect(){}};},createBufferSource(){const s={connect(){},disconnect(){},start(){this.started=true;},stop(when){this.stopped=true;this.stopTime=when;}};this.sources.push(s);return s;},decodeAudioData:async()=>({duration:32/3}),close(){}};
 const audio=new BeatAudio({contextFactory:()=>ctx,fetchFn});return {ctx,audio,session:createPcAudioSession(audio)};
}
test('owners isolate transport while descriptors and pause position stay intact',async()=>{
 const {ctx,audio,session}=fixture(),web=session.forOwner('underweb'),ft=session.forOwner('ft-studio'),d=descriptor();
 assert.equal(await web.playDescriptor(d),true);ctx.currentTime+=2;const before=web.getSnapshot();
 ft.stop();ft.pause();session.stopOwner('ft-studio');
 assert.equal(session.isOwner('underweb'),true);assert.equal(audio.sources.length,1);assert.deepEqual(web.getSnapshot(),before);assert.equal(ft.getSnapshot().status,'stopped');assert.equal(ft.error,'');assert.equal(d.owner,'saved-owner');
 web.pause();const offset=web.getSnapshot().positionSeconds;assert.ok(offset>1);assert.equal(await web.playDescriptor(d),true);assert.equal(web.getSnapshot().positionSeconds,offset);
 await ft.play({stage:1});assert.equal(session.isOwner('ft-studio'),true);assert.equal(web.getSnapshot().status,'stopped');session.stopOwner('ft-studio');assert.equal(audio.status,'stopped');session.dispose();
});
test('closing or replacing the owner cancels actual pending BeatAudio fetch',async()=>{
 for(const action of ['close','replace','dispose']){
  let resolve;const {ctx,audio,session}=fixture(()=>new Promise(r=>resolve=r)),web=session.forOwner('underweb');
  const pending=web.playDescriptor(descriptor('pending','beginner-drums-01'));await new Promise(r=>setImmediate(r));
  if(action==='close')session.stopOwner('underweb');else if(action==='dispose')session.dispose();else await session.forOwner('ft-studio').playDescriptor(descriptor('replacement'));
  resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)});assert.equal(await pending,false);
  assert.equal(ctx.sources.length,action==='replace'?1:0);if(action==='replace')assert.equal(audio.descriptor.key,'replacement');session.dispose();
 }
});
test('failed autoplay remains an explicit error and has no delayed restart',async()=>{
 const {ctx,audio,session}=fixture();ctx.state='suspended';ctx.resume=async()=>{throw Error('gesture required');};
 const web=session.forOwner('underweb');assert.equal(await web.playDescriptor(descriptor()),false);assert.match(web.error,/звук/);ctx.state='running';await new Promise(r=>setImmediate(r));assert.equal(audio.sources.length,0);assert.equal(web.getSnapshot().status,'error');session.dispose();
});
test('fade is forwarded only by the owning adapter',async()=>{
 const calls=[],audio={play:()=>true,stop:options=>calls.push(options),dispose(){},getSnapshot:()=>({status:'playing'})},session=createPcAudioSession(audio),work=session.forOwner('creative-work');
 await work.play();calls.length=0;session.forOwner('ft-studio').stop({fadeSeconds:.02});assert.equal(calls.length,0);work.stop({fadeSeconds:.08});assert.deepEqual(calls,[{fadeSeconds:.08}]);session.dispose();
});
test('social one-shot playback ends at its remaining duration; FT defaults continue looping',async()=>{
 const {ctx,audio,session}=fixture(),web=session.forOwner('underweb'),d=descriptor(),before=JSON.stringify(d);
 await web.playDescriptor(d,{loop:false});const first=ctx.sources[0];assert.ok(Math.abs(first.stopTime-(10.04+32/3))<1e-8);
 ctx.currentTime=12.04;web.pause();await web.playDescriptor(d,{loop:false});const resumed=ctx.sources[1];assert.ok(Math.abs(resumed.stopTime-(12.08+32/3-2))<1e-8);
 const ended=resumed.onended;ended();assert.equal(web.getSnapshot().status,'stopped');assert.equal(web.getSnapshot().positionSeconds,0);assert.equal(audio.sources.length,0);
 await session.forOwner('ft-studio').playDescriptor(descriptor('ft'));const ft=ctx.sources.at(-1);assert.equal(ft.loop,true);assert.equal(ft.stopTime,undefined);ended();assert.equal(audio.status,'playing');assert.equal(JSON.stringify(d),before);session.dispose();
});
test('owner subscriptions emit transport and clock snapshots and release the shared timer',async t=>{
 t.mock.timers.enable({apis:['setInterval']});const {ctx,session}=fixture(),web=session.forOwner('underweb'),ft=session.forOwner('ft-studio'),seen=[],other=[];
 assert.equal(typeof web.subscribe,'function');const unsubscribe=web.subscribe(snapshot=>seen.push(snapshot)),unsubOther=ft.subscribe(snapshot=>other.push(snapshot));
 await web.playDescriptor(descriptor('social'),{loop:false});assert.equal(seen.at(-1).key,'social');assert.equal(seen.at(-1).status,'playing');ctx.currentTime+=2;t.mock.timers.tick(100);assert.ok(seen.at(-1).positionSeconds>1);
 assert.equal(other.at(-1).status,'stopped');web.pause();assert.equal(seen.at(-1).status,'paused');web.stop();assert.equal(seen.at(-1).positionSeconds,0);
 unsubscribe();unsubOther();const count=seen.length;t.mock.timers.tick(1000);assert.equal(seen.length,count);session.dispose();
});
test('real desktop navigation and leaving retain music; close owner, shutdown and reset stop it',async()=>{
 const {audio,ctx}=fixture(),d=pcDocument(),root=d.createElement('div'),pc=mountVirtualPc(root,{beatAudio:audio});
 pc.showDesktop(createVirtualPcState({power:'on'}));pc.openNow('underweb');pc.navigateUnderweb('underweb://social/community/makarevich-1');
 // The row calls the app adapter, not a DOM-local player.
 const row=allPc(root).find(n=>n.dataset?.socialAudio);assert.ok(row);row.click();await new Promise(r=>setImmediate(r));
 assert.equal(audio.status,'playing');assert.equal(pc.audioSession.isOwner('underweb'),true);
 await pc.audioSession.forOwner('underweb').playDescriptor(descriptor());ctx.currentTime+=1;
 const source=audio.sources[0],position=audio.getSnapshot().positionSeconds;
 pc.navigateUnderweb('underweb://social/friends');pc.requestLeave();pc.closeNow('ft-studio');
 assert.equal(source.stopped,undefined);assert.equal(audio.status,'playing');assert.equal(audio.getSnapshot().positionSeconds,position);
 pc.closeNow('underweb');assert.equal(source.stopped,true);
 for(const stop of [()=>pc.requestShutdown(),()=>pc.reset(pc.state)]){await pc.audioSession.forOwner('underweb').playDescriptor(descriptor());stop();assert.equal(audio.status,'stopped');}
 pc.dispose();assert.equal(audio.disposed,true);
});

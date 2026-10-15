import test from 'node:test';
import assert from 'node:assert/strict';
import {BeatAudio} from '../src/beat-audio.js';
import {createPcAudioSession} from '../src/pc-audio-session.js';
import {createSocialAudio} from '../src/social-audio-view.js';
import {pcDocument,allPc,findButton} from './helpers/virtual-pc-dom.js';

// Real transport/session/row, replacing only the unavailable Web Audio boundary.
const version=(id='saved')=>({id,name:'Запись '+id,schemaVersion:1,recipe:{dspVersion:1,descriptor:{key:'frozen',owner:'export',durationSeconds:20,parts:[{id:'primitive',loopSeconds:16/3}]}}});
function fixture(t,options={}){
 t.mock.timers.enable({apis:['setInterval']});
 const ctx={state:'running',currentTime:10,destination:{},sources:[],createBuffer(channels,length,rate){return {duration:length/rate,copyToChannel(){}};},createGain(){return {gain:{value:0},connect(){},disconnect(){this.disconnected=true;}};},createBufferSource(){const s={connect(){},disconnect(){this.disconnected=true;},start(when,offset){Object.assign(this,{when,offset});},stop(when){this.stopTime=when;this.stopped=true;}};this.sources.push(s);return s;},close(){}};
 const audio=new BeatAudio({contextFactory:()=>ctx,...options}),session=createPcAudioSession(audio),adapter=session.forOwner('underweb'),view=createSocialAudio(adapter),d=pcDocument();
 t.after(()=>{view.dispose();session.dispose();});
 return {ctx,audio,session,adapter,view,d,row:v=>view.row(d,{version:v??version()}),tick:()=>t.mock.timers.tick(100)};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const toggle=row=>allPc(row).find(n=>n.dataset?.socialAudio);
const bar=row=>allPc(row).find(n=>n.getAttribute?.('role')==='progressbar');
const time=row=>allPc(row).find(n=>n.className==='sn-audio-time');

test('one left button toggles play, pause and resume without replacing focused DOM',async t=>{
 const {row,ctx,audio}=fixture(t),node=row(),play=toggle(node),children=[...node.children];play.focus();
 assert.equal(allPc(node).filter(n=>n.tagName==='BUTTON').length,2);
 play.click();await flush();assert.equal(play.getAttribute('aria-label'),'Пауза: Запись saved');assert.equal(audio.status,'playing');
 ctx.currentTime=13.04;play.click();assert.equal(audio.status,'paused');assert.equal(play.getAttribute('aria-label'),'Слушать: Запись saved');
 play.click();await flush();assert.equal(audio.status,'playing');assert.ok(Math.abs(ctx.sources.at(-1).offset-3)<1e-8);
 assert.deepEqual(node.children,children);assert.equal(node.ownerDocument.activeElement,play);
});

test('half duration updates accessible progress and time in every same-track row; stop rewinds both',async t=>{
 const {row,ctx,tick}=fixture(t),first=row(),second=row();toggle(first).click();await flush();
 ctx.currentTime=20.04;tick();
 for(const node of [first,second]){assert.equal(bar(node).getAttribute('aria-valuenow'),'50');assert.equal(time(node).textContent,'0:10 / 0:20');assert.equal(toggle(node).getAttribute('aria-label'),'Пауза: Запись saved');}
 findButton(second,'Остановить: Запись saved').click();
 for(const node of [first,second]){assert.equal(bar(node).getAttribute('aria-valuenow'),'0');assert.equal(time(node).textContent,'0:00 / 0:20');assert.equal(toggle(node).getAttribute('aria-label'),'Слушать: Запись saved');}
});

test('another descriptor and another app owner never drive this row or get stopped by it',async t=>{
 const {row,ctx,tick,session,audio}=fixture(t),first=row(),other=row(version('other'));toggle(other).click();await flush();ctx.currentTime=20.04;tick();
 assert.equal(bar(first).getAttribute('aria-valuenow'),'0');assert.equal(toggle(first).getAttribute('aria-label'),'Слушать: Запись saved');
 findButton(first,'Остановить: Запись saved').click();assert.equal(audio.status,'playing');assert.equal(audio.descriptor.key,'version:other');
 await session.forOwner('ft-studio').playDescriptor({key:'version:saved',owner:'studio',durationSeconds:20,parts:[{id:'primitive',loopSeconds:16/3}]});ctx.currentTime+=5;tick();
 assert.equal(bar(first).getAttribute('aria-valuenow'),'0');findButton(first,'Остановить: Запись saved').click();assert.equal(audio.status,'playing');
});

test('natural end resets all row controls and releases voices without changing the saved recipe',async t=>{
 const {row,audio,ctx,tick}=fixture(t),saved=version(),before=JSON.stringify(saved),node=row(saved);toggle(node).click();await flush();
 const source=ctx.sources[0];assert.ok(Math.abs(source.stopTime-30.04)<1e-8);ctx.currentTime=30.04;source.onended();tick();
 assert.equal(audio.status,'stopped');assert.equal(audio.sources.length,0);assert.equal(source.disconnected,true);
 assert.equal(toggle(node).getAttribute('aria-label'),'Слушать: Запись saved');assert.equal(bar(node).getAttribute('aria-valuenow'),'0');assert.equal(JSON.stringify(saved),before);
});

test('loading can be cancelled and a late unlock cannot restart disposed controls',async t=>{
 let finish;const {row,ctx,audio,view}=fixture(t);ctx.state='suspended';ctx.resume=()=>new Promise(resolve=>finish=()=>{ctx.state='running';resolve();});
 const node=row(),play=toggle(node);play.click();assert.equal(node.getAttribute('aria-busy'),'true');assert.equal(play.disabled,false);assert.equal(play.getAttribute('aria-disabled'),'true');
 findButton(node,'Остановить: Запись saved').click();assert.equal(node.getAttribute('aria-busy'),'false');assert.equal(play.disabled,false);
 view.dispose();finish();await flush();assert.equal(audio.sources.length,0);play.click();await flush();assert.equal(audio.status,'stopped');
});

test('playback errors are explicit and retryable, and view disposal releases its subscription',async t=>{
 const {row,ctx,audio,view,tick}=fixture(t);ctx.state='suspended';ctx.resume=async()=>{throw Error('blocked');};const node=row();toggle(node).click();await flush();
 assert.equal(audio.status,'error');assert.equal(toggle(node).disabled,false);assert.ok(allPc(node).some(n=>/Не удалось/.test(n.textContent??'')));
 ctx.state='running';toggle(node).click();await flush();assert.equal(audio.status,'playing');view.dispose();ctx.currentTime+=10;tick();
 assert.equal(time(node).textContent,'0:00 / 0:20');
});

test('replacing owned rows releases their updates and handlers while an unattached replacement stays live',async t=>{
 const {row,view,d,ctx,audio,tick}=fixture(t),host=d.createElement('section'),old=row();host.append(old);toggle(old).click();await flush();
 const retiredBar=bar(old),setAttribute=retiredBar.setAttribute.bind(retiredBar);let writes=0;retiredBar.setAttribute=(...args)=>{writes++;setAttribute(...args);};
 const replacement=row();ctx.currentTime=20.04;tick();assert.equal(bar(replacement).getAttribute('aria-valuenow'),'50','construction before attachment must keep its registration');
 view.releaseRows(host);host.replaceChildren(replacement);writes=0;ctx.currentTime=21.04;tick();
 assert.equal(writes,0,'removed rows must receive no later snapshot writes');assert.equal(retiredBar.getAttribute('aria-valuenow'),'50');assert.equal(bar(replacement).getAttribute('aria-valuenow'),'55');
 toggle(old).click();assert.equal(audio.status,'playing','retired controls must release their handlers without stopping the recording');
});

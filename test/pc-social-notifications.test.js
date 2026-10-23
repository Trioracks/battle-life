import test from 'node:test';
import assert from 'node:assert/strict';
import {createPcSocialNotifications} from '../src/pc-social-notifications.js';

function harness(){
 const nodes=[],sources=[],param=()=>({value:0,values:[],setValueAtTime(v,t){this.values.push([v,t]);},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(v){this.value=v;}});
 const node=kind=>{const n={kind,frequency:param(),gain:param(),pan:param(),Q:param(),connect(to){this.to=to;return to;},disconnect(){this.disconnected=true;},start(t){this.started=t;},stop(t){this.stopped=t;}};nodes.push(n);return n;};
 const context={currentTime:2,sampleRate:44100,state:'running',destination:{},resume:async()=>{},createBiquadFilter:()=>node('filter'),createGain:()=>node('gain'),createStereoPanner:()=>node('pan'),createOscillator:()=>{const n=node('oscillator');sources.push(n);return n;}};
 const sound=createPcSocialNotifications({contextFactory:()=>context});
 const state=(ids=[],power='on')=>({power,socialRuntime:{events:ids.map(id=>({id,type:'personal-message'}))},phone:{queue:[]}});
 return {sound,state,sources,nodes,context};
}
const room={source:[4,1,-1],listener:[4,1,1],right:[1,0,0],desktop:false,occluded:false};

test('load is quiet; only new incoming events play four spatial beeps, once',async()=>{
 const h=harness();await h.sound.unlock();h.sound.update(h.state(['old']),{frame:room});assert.equal(h.sources.length,0);
 const next=h.state(['old','new']);h.sound.update(next,{frame:room});assert.equal(h.sources.length,4);
 assert.deepEqual(h.sources.map(n=>Number(n.started.toFixed(2))),[2,2.16,2.32,2.48]);
 for(const source of h.sources)assert.equal(source.to.to,h.nodes[0],'oscillator must feed the room filter via its envelope');
 h.sound.update(next,{frame:room});h.sound.update(h.state(['old','new']),{frame:room});assert.equal(h.sources.length,4);
 h.sound.dispose();assert.ok(h.sources.every(n=>n.disconnected));
});
test('PC off and hidden events are consumed quietly and never replay when resumed',async()=>{
 const h=harness();await h.sound.unlock();h.sound.update(h.state(),{frame:room});
 h.sound.update(h.state(['off'],'off'),{frame:room});h.sound.update(h.state(['off','hidden']),{frame:room,enabled:false});
 h.sound.update(h.state(['off','hidden']),{frame:room});assert.equal(h.sources.length,0);
 h.sound.update(h.state(['off','hidden','fresh']),{frame:room});assert.equal(h.sources.length,4);
 h.sound.reset(h.state(['other-career']));h.sound.update(h.state(['other-career']),{frame:room});assert.equal(h.sources.length,4);
 h.sound.dispose();
});
test('community notices share the PC speaker; kitchen attenuation follows existing room acoustics',async()=>{
 const h=harness();await h.sound.unlock();h.sound.update(h.state(),{frame:room});
 const next=h.state();next.phone.queue=[{id:'community:1',source:'В кругу',type:'community-post'}];
 h.sound.update(next,{frame:room});const near=h.nodes.find(n=>n.kind==='gain').gain.value;
 h.sound.update(next,{frame:{...room,listener:[-4,1,1],occluded:true,desktop:true}});
 assert.ok(h.nodes.find(n=>n.kind==='gain').gain.value<near*.2,'notifications remain spatial even in desktop mode');
 assert.equal(h.sources.length,4);h.sound.dispose();
});

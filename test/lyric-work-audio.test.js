import test from 'node:test';
import assert from 'node:assert/strict';
import * as module from '../src/lyric-work-audio.js';
test('typing only schedules while a text job works and disconnects when hidden or leaving',async()=>{
 assert.equal(typeof module.createLyricWorkAudio,'function');let started=0,stopped=0;
 const param=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}}),node=()=>({connect(){},disconnect(){}});
 const c={state:'running',currentTime:0,sampleRate:44100,destination:{},resume:async()=>{},close:async()=>{},createBuffer:()=>({getChannelData:()=>new Float32Array(1235)}),createBufferSource:()=>({...node(),start(){started++;},stop(){stopped++;}}),createBiquadFilter:()=>({...node(),frequency:param(),Q:param()}),createGain:()=>({...node(),gain:param()})};
 const a=module.createLyricWorkAudio({contextFactory:()=>c});await a.unlock();
 a.sync({phase:'desktop',job:{projectId:'t'}});assert.equal(started,0);
 a.sync({phase:'working',job:{projectId:'t'},hidden:false});assert.equal(started,1);
 a.sync({phase:'working',job:{projectId:'t'},hidden:false});assert.equal(started,1);
 a.sync({phase:'working',job:{projectId:'t'},hidden:true});assert.equal(stopped,1);
 c.currentTime=2;a.sync({phase:'working',job:{projectId:'t'},hidden:false});assert.equal(started,1);
 await a.enableAudio();a.sync({phase:'working',job:{projectId:'t'},hidden:false});assert.equal(started,2);
 a.dispose();c.currentTime=3;a.sync({phase:'working',job:{projectId:'t'}});assert.equal(started,2);
});

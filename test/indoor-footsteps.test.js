import test from 'node:test';import assert from 'node:assert/strict';import {AudioContext} from './helpers/pc-audio.js';
const {playIndoorFootstep}=await import('../src/indoor-footsteps.js').catch(()=>({}));
test('step peaks are more than three times quieter with a restrained bass thump',()=>{
 for(let i=0;i<4;i++){const c=new AudioContext(),gains=[],create=c.createGain.bind(c);c.createGain=()=>{const g=create();gains.push(g);return g;};playIndoorFootstep(c,i);
 assert.ok(Math.max(...gains[0].gain.values)<=.035);assert.ok(Math.max(...gains[1].gain.values)<=.01);}
});
test('four bounded soft sole variations use noise plus a low thump',()=>{assert.equal(typeof playIndoorFootstep,'function');const durations=[];for(let i=0;i<4;i++){const c=new AudioContext(),s=playIndoorFootstep(c,i);assert.equal(c.sources.length,2);assert.ok(c.sources[0].buffer);durations.push(c.sources[0].stopTime);assert.ok(c.sources.every(n=>n.stopTime<=.22));s.stop();}assert.equal(new Set(durations).size,4);});

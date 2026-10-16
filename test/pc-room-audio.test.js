import test from 'node:test';
import assert from 'node:assert/strict';
import {roomAudioParameters,createPcRoomOutput,segmentIntersectsBox} from '../src/pc-room-audio.js';
const frame={source:[4.63,1.145,-.805],listener:[4.48,1.6,.85],right:[1,0,0],desktop:false,occluded:false};
test('distance and wall muffle PC speakers, desktop is full-level centered',()=>{
 const near=roomAudioParameters(frame),kitchen=roomAudioParameters({...frame,listener:[-3.8,1.6,.85],occluded:true});
 assert.ok(kitchen.gain<near.gain*.2);assert.ok(kitchen.cutoffHz<near.cutoffHz);assert.ok(kitchen.cutoffHz>=700);
 assert.deepEqual(roomAudioParameters({...frame,desktop:true}),{gain:1,cutoffHz:18000,pan:0});
 assert.deepEqual(roomAudioParameters({...frame,cameraPosition:[900,900,900]}),near);
 assert.ok(near.pan*roomAudioParameters({...frame,right:[-1,0,0]}).pan<0);
 assert.equal(roomAudioParameters({...frame,listener:frame.source}).pan,0);
});
test('invalid frames cannot send NaN into audio parameters',()=>{
 for(const value of [null,{}, {...frame,listener:[NaN,0,0]}, {...frame,right:[0,0,0]}])assert.ok(Object.values(roomAudioParameters(value)).every(Number.isFinite));
});
test('segment tests cover wall, doorway, same side and parallel paths',()=>{
 const wall={min:[-.08,0,-1.72],max:[.08,2.94,.18]};
 assert.equal(segmentIntersectsBox([4,1.6,-.8],[-4,1.6,-.8],wall),true);
 assert.equal(segmentIntersectsBox([4,1.6,.8],[-4,1.6,.8],wall),false);
 assert.equal(segmentIntersectsBox([4,1.6,-.8],[2,1.6,-.8],wall),false);
 assert.equal(segmentIntersectsBox([4,1.6,-.8],[4,1.6,.8],wall),false);
});
test('output is lowpass → gain → panner and smooths every update without leaking nodes',()=>{
 const nodes=[],param=()=>({value:0,calls:[],setTargetAtTime(...args){this.calls.push(args);}}),node=kind=>{const n={kind,disconnects:0,connect(to){this.to=to;return to;},disconnect(){this.disconnects++;}};nodes.push(n);return n;};
 const ctx={sampleRate:44100,currentTime:2,destination:{},createBiquadFilter:()=>Object.assign(node('lowpass'),{frequency:param(),Q:param()}),createGain:()=>Object.assign(node('gain'),{gain:param()}),createStereoPanner:()=>Object.assign(node('pan'),{pan:param()})};
 const output=createPcRoomOutput(ctx);assert.equal(output.input,nodes[0]);assert.equal(nodes[0].to,nodes[1]);assert.equal(nodes[1].to,nodes[2]);assert.equal(nodes[2].to,ctx.destination);
 const before=JSON.stringify(frame);output.update(frame);assert.equal(JSON.stringify(frame),before);
 for(const p of [nodes[0].frequency,nodes[1].gain,nodes[2].pan])assert.deepEqual(p.calls.at(-1).slice(1),[2,.1]);
 output.dispose();output.dispose();assert.ok(nodes.every(n=>n.disconnects===1));const count=nodes[1].gain.calls.length;output.update(frame);assert.equal(nodes[1].gain.calls.length,count);
});

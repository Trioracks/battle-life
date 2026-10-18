import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,readdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {decodePcm16} from '../tools/audio/source-loop.mjs';
import {prepareSourcePcm} from '../tools/audio/beat-skill-ladder.mjs';

const api=await import('../tools/audio/flow-genre-curve.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
const fn=name=>{assert.equal(typeof api[name],'function',`missing comparison behavior: ${name}`);return api[name];};
const rate=12000;
const tone=(hz,seconds=3)=>Float32Array.from({length:Math.round(seconds*rate)},(_,i)=>.12*Math.sin(2*Math.PI*hz*i/rate));
const rms=x=>Math.sqrt(x.reduce((s,v)=>s+v*v,0)/x.length);
function pitch(x,start,end) {
  let best=0,frequency=0;
  for(let hz=425;hz<=455;hz+=.25) {
    let re=0,im=0;
    for(let i=Math.round(start*rate);i<Math.round(end*rate);i++){re+=x[i]*Math.cos(2*Math.PI*hz*i/rate);im+=x[i]*Math.sin(2*Math.PI*hz*i/rate);}
    if(Math.hypot(re,im)>best){best=Math.hypot(re,im);frequency=hz;}
  }
  return frequency;
}

test('shared min skill and nonlinear severity obey independent milestones and boundaries',()=>{
  const effective=fn('effectiveSkill'),severity=fn('severityAt');
  for(const [a,b,want] of [[100,10,10],[10,100,10],[0,80,0],[80,0,0],[80,100,80]])assert.equal(effective(a,b),want);
  for(const bad of [undefined,null,'10',NaN,Infinity,-1,101]){assert.throws(()=>effective(bad,100));assert.throws(()=>effective(100,bad));assert.throws(()=>severity(bad));}
  for(const [s,want] of [[0,1],[12.5,.7071067811865476],[25,.5],[37.5,.2],[50,.08],[80,.025],[90,.00625],[100,0]])assert.ok(Math.abs(severity(s)-want)<1e-12,`${s}`);
  let prior=1;
  for(let s=0;s<=100;s+=.05){const v=severity(s);assert.ok(v<=prior+1e-12&&v>=0&&v<=1);prior=v;}
  for(const s of [25,50,80,100])assert.ok(Math.abs(severity(s)-severity(s-1e-7))<1e-7);
});

test('segmentation uses active audio, fixed event ranks give rare nested timing and speed errors',()=>{
  const detect=fn('detectPhrases'),plan=fn('vocalPlan');
  const x=new Float32Array(12*rate);
  for(const [a,b] of [[.2,1.2],[1.55,2.7],[3.1,4.6]])for(let i=a*rate;i<b*rate;i++)x[i]=.1*Math.sin(2*Math.PI*440*i/rate);
  const spans=detect([x],rate);
  assert.equal(spans.length,3);assert.ok(spans.every(p=>p.end<4.8&&p.end-p.start>.9));
  const phrases=Array.from({length:1000},(_,i)=>({start:i*3+.4,end:i*3+2.4}));
  const counts={},timingCounts={};let previous,previousTiming;
  for(const s of [0,25,50,80,100]){
    const p=plan(phrases,s,100,33,3001);
    assert.deepEqual(p,plan(phrases,100,s,33,3001));
    const selected=new Set(p.events.filter(e=>e.speedActive).map(e=>e.index));
    if(previous)for(const i of selected)assert.ok(previous.has(i));previous=selected;counts[s]=selected.size/1000;
    const timingSelected=new Set(p.events.filter(e=>e.timingActive).map(e=>e.index));
    if(previousTiming)for(const i of timingSelected)assert.ok(previousTiming.has(i));previousTiming=timingSelected;timingCounts[s]=timingSelected.size/1000;
    for(const e of p.events){assert.ok(Math.abs(e.offsetSeconds)<=.25*p.severity+1e-12);assert.ok(e.tempoAmplitude<=.4*p.severity+1e-12);}
  }
  assert.ok(counts[0]>.75);assert.ok(counts[50]>.09&&counts[50]<.16,JSON.stringify(counts));assert.ok(counts[80]>.02&&counts[80]<.06);assert.equal(counts[100],0);
  assert.equal(timingCounts[0],1);assert.equal(timingCounts[25],.75);assert.equal(timingCounts[50],.25);assert.equal(timingCounts[80],.04);assert.equal(timingCounts[100],0);
});

test('four real phrase entry quotas select ranked nested audible shifts and respect genre',()=>{
  const phrases=[{start:.26,end:1.36},{start:1.47,end:2.78},{start:2.87,end:4.12},{start:4.15,end:5.05}],plan=fn('vocalPlan');
  let previous=new Set([0,1,2,3]);
  const initial=plan(phrases,0,100,33,10.6666666667);
  for(const [level,want] of [[0,4],[10,3],[25,3],[50,1],[80,0],[100,0]]){
    const p=plan(phrases,level,100,33,10.6666666667),active=p.events.filter(e=>e.timingActive);
    assert.equal(active.length,want);assert.deepEqual(p,plan(phrases,100,level,33,10.6666666667));
    assert.deepEqual(p.events.map(e=>e.index),[0,1,2,3]);for(const e of active){assert.ok(previous.has(e.index));assert.ok(Math.abs(e.offsetSeconds)>=.005,JSON.stringify(e));assert.equal(Math.sign(e.offsetSeconds),Math.sign(initial.events[e.index].offsetSeconds));}previous=new Set(active.map(e=>e.index));
  }
  const full=[{start:0,end:1}];assert.equal(plan(full,50,100,33,1).events.filter(e=>e.timingActive).length,0);
  assert.deepEqual(plan([],0,100,33,1).events,[]);
  const a=plan(phrases,25,100,33,10.6666666667),b=plan(phrases,25,100,34,10.6666666667);assert.notDeepEqual(a.events.map(e=>e.offsetSeconds),b.events.map(e=>e.offsetSeconds));
  const source=new Float32Array(12*rate);for(const p of phrases)source[Math.round((p.start+.1)*rate)]=.5;
  const got=fn('processVocal')([source],rate,50,100,{phrases,seed:33}),selected=got.plan.events.find(e=>e.timingActive);
  const original=Math.round((selected.start+.1)*rate),shifted=original+Math.round(selected.offsetSeconds*rate);
  assert.ok(Math.abs(got.channels[0][shifted])>.4);assert.equal(got.channels[0][original],0);
});

function amplitudeAt(x,sampleRate,hz,start=.4,end=x.length/sampleRate-.4){
  let re=0,im=0;const a=Math.round(start*sampleRate),b=Math.round(end*sampleRate);
  for(let i=a;i<b;i++){re+=x[i]*Math.cos(2*Math.PI*hz*i/sampleRate);im+=x[i]*Math.sin(2*Math.PI*hz*i/sampleRate);}
  return Math.hypot(re,im)*2/(b-a);
}

test('beat v2 uses shared curve, strong novice roles, steeply improving tuning and exact 100',()=>{
  const params=fn('beatParameters'),process=fn('processBeat');
  assert.equal(params('bass',0,100).detuneCents,380);assert.equal(params('melody',100,0).detuneCents,-460);
  assert.ok(Math.abs(params('melody',50,100).detuneCents)<11);
  assert.equal(params('melody',49.999,100).detuneCents,0,'tiny detune must bypass before50');
  for(const role of ['drums','bass','melody']){
    assert.equal(params(role,25,100).severity,.5);assert.deepEqual(process([tone(440,1)],rate,role,100,100),[tone(440,1)]);
    const source=tone(440,1),near=process([source],rate,role,99.999,100)[0];assert.ok(near.every((x,i)=>Math.abs(x-source[i])<1e-7));
  }
});

const miniature=()=>({sampleRate:rate,durationSeconds:3,outputGain:.75,parts:[
  ...[['d','drums',4000],['m','melody',600],['b','bass',80],['v','vocal',440]].map(([id,role,hz])=>({id,role,channels:[tone(hz)],sourceGainDb:-3,windows:[{startBar:0,bars:1.125,sourceBar:0}]}))
]});

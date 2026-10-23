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

// Catches using max(), asymmetric genre rules, coercion, linear severity and discontinuities.
test('shared min skill and nonlinear severity obey independent milestones and boundaries',()=>{
  const effective=fn('effectiveSkill'),severity=fn('severityAt');
  for(const [a,b,want] of [[100,10,10],[10,100,10],[0,80,0],[80,0,0],[80,100,80]])assert.equal(effective(a,b),want);
  for(const bad of [undefined,null,'10',NaN,Infinity,-1,101]){assert.throws(()=>effective(bad,100));assert.throws(()=>effective(100,bad));assert.throws(()=>severity(bad));}
  for(const [s,want] of [[0,1],[12.5,.7071067811865476],[25,.5],[37.5,.2],[50,.08],[80,.025],[90,.00625],[100,0]])assert.ok(Math.abs(severity(s)-want)<1e-12,`${s}`);
  let prior=1;
  for(let s=0;s<=100;s+=.05){const v=severity(s);assert.ok(v<=prior+1e-12&&v>=0&&v<=1);prior=v;}
  for(const s of [25,50,80,100])assert.ok(Math.abs(severity(s)-severity(s-1e-7))<1e-7);
});

// Catches counting padded silence as speech and changes to seeded event identity.
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

// Catches rank-threshold sampling failing the four-phrase user quota, zero
// displacement labels, rerolls and reassignment of existing source order.
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

// Catches coupled-channel phase analysis leaking a different signal across stereo.
test('44100Hz warp preserves independent stereo spectra and silent channels',()=>{
  const r=44100,make=(hz,gain)=>Float32Array.from({length:3*r},(_,i)=>gain*Math.sin(2*Math.PI*hz*i/r));
  for(const amount of [.2,.4]){
    const out=fn('warpPhrase')([make(440,.1),make(660,.025)],r,amount);
    const leftOwn=amplitudeAt(out[0],r,440),leftOther=amplitudeAt(out[0],r,660),rightOwn=amplitudeAt(out[1],r,660),rightOther=amplitudeAt(out[1],r,440);
    assert.ok(leftOwn>.02&&rightOwn>.005,JSON.stringify({amount,leftOwn,rightOwn}));
    assert.ok(leftOther<leftOwn*.01&&rightOther<rightOwn*.01,JSON.stringify({amount,leftOwn,leftOther,rightOwn,rightOther}));
  }
  const silent=fn('warpPhrase')([make(440,.1),new Float32Array(3*r)],r,.4);
  assert.ok(silent[1].every(x=>x===0));
});

// Catches meaningful tail truncation and duration/pitch drift at the actual phrase lengths.
test('actual-rate short phrases retain ordered late markers and fundamental through tempo changes',()=>{
  const r=44100;
  for(const seconds of [.9,1.1,1.25,1.31]){
    const x=Float32Array.from({length:Math.round(seconds*r)},(_,i)=>.1*Math.sin(2*Math.PI*440*i/r));
    const out=fn('warpPhrase')([x],r,.4)[0];assert.equal(out.length,x.length);
    for(const [a,b] of [[.15,.4],[seconds*.6,seconds*.85]]){
      let best=0,hzAt=0;
      for(let hz=435;hz<=445;hz+=.1){const v=amplitudeAt(out,r,hz,a,b);if(v>best){best=v;hzAt=hz;}}
      assert.ok(Math.abs(hzAt-440)<1.5,`${seconds}s: ${hzAt}Hz`);
    }
    const bursts=new Float32Array(x.length),times=[.1,seconds*.32,seconds*.58,seconds-.09],frequencies=[700,1000,1400,1900];
    for(let k=0;k<times.length;k++)for(let j=0;j<Math.round(.025*r);j++)bursts[Math.round(times[k]*r)+j]=.2*Math.sin(Math.PI*j/(.025*r))*Math.sin(2*Math.PI*frequencies[k]*j/r);
    const changed=fn('warpPhrase')([bursts],r,.4)[0],centers=[];
    for(const hz of frequencies){let best=0,at=0;for(let t=.02;t<seconds-.03;t+=.005){const v=amplitudeAt(changed,r,hz,t,t+.03);if(v>best){best=v;at=t+.015;}}assert.ok(best>.005,`${seconds}s marker ${hz} lost`);centers.push(at);}
    assert.ok(centers.every((v,i)=>!i||v>centers[i-1]),JSON.stringify({seconds,centers}));
    assert.ok(centers[3]>seconds-.18&&centers[3]<seconds,JSON.stringify({seconds,centers}));
  }
});

// Catches rate-resampling instead of pitch-preserving variable stretching, global translation,
// lost tails, stereo divergence and merely recording the requested tempo in metadata.
test('actual continuous within-phrase tempo moves ordered bursts while preserving fundamental and stereo',()=>{
  const warp=fn('warpPhrase');
  const source=tone(440),right=Float32Array.from(source,x=>x*.5);
  const out=warp([source,right],rate,.4);
  assert.equal(out[0].length,source.length);
  assert.ok(Math.abs(pitch(out[0],.4,.9)-440)<1);assert.ok(Math.abs(pitch(out[0],1.7,2.2)-440)<1);
  for(let i=0;i<source.length;i++)assert.ok(Number.isFinite(out[0][i])&&Math.abs(out[1][i]-out[0][i]*.5)<1e-6);
  const bursts=new Float32Array(4*rate);
  for(const [k,hz] of [400,800,1200,1600].entries())for(let i=0;i<.18*rate;i++)bursts[Math.round((.4+k)*rate)+i]=.2*Math.sin(Math.PI*i/(.18*rate))*Math.sin(2*Math.PI*hz*i/rate);
  const moved=warp([bursts],rate,.4)[0];
  const centers=[];
  for(const hz of [400,800,1200,1600]){
    let best=0,at=0;
    for(let j=0;j<moved.length-600;j+=120){let re=0,im=0;for(let i=j;i<j+600;i++){re+=moved[i]*Math.cos(2*Math.PI*hz*i/rate);im+=moved[i]*Math.sin(2*Math.PI*hz*i/rate);}if(Math.hypot(re,im)>best){best=Math.hypot(re,im);at=(j+300)/rate;}}
    assert.ok(best>1);centers.push(at);
  }
  assert.ok(centers.every((x,i)=>!i||x>centers[i-1]));
  assert.ok(Math.abs(centers[0]-.49)>.12,JSON.stringify(centers));
  assert.ok(Math.abs((centers[1]-centers[0])-(centers[3]-centers[2]))>.15,JSON.stringify(centers));
  assert.ok(centers[3]<4&&centers[3]>3);
});

// Catches dynamics boosts, whole-take offset, accidental old vocal DSP, wet dry bypass,
// and nonconvergent near-100 rubberband artifacts.
test('vocal processing attenuates accents/endings, bounds phrase placement and bypasses 100 exactly',()=>{
  const process=fn('processVocal'),source=tone(440,5),before=source.slice();
  const phrases=[{start:.4,end:2.1},{start:2.7,end:4.6}];
  const dry=process([source],rate,100,100,{phrases});assert.deepEqual(dry.channels,[source]);
  const near=process([source],rate,99.999,100,{phrases});
  let delta=0;for(let i=0;i<source.length;i++)delta=Math.max(delta,Math.abs(source[i]-near.channels[0][i]));assert.ok(delta<1e-7);
  const a=process([source],rate,0,100,{phrases}),b=process([source],rate,100,0,{phrases});assert.deepEqual(a,b);
  assert.notEqual(a.plan.events[0].offsetSeconds,a.plan.events[1].offsetSeconds);
  assert.ok(a.plan.events.some(e=>e.accentDb<=-7));assert.ok(a.plan.events.every(e=>e.endDb===-12));
  assert.ok(rms(a.channels[0])<rms(source));assert.deepEqual(source,before);
});

test('beat v2 uses shared curve, strong novice roles, steeply improving tuning and exact 100',()=>{
  const params=fn('beatParameters'),process=fn('processBeat');
  assert.equal(params('bass',0,100).detuneCents,380);assert.equal(params('melody',100,0).detuneCents,-460);
  assert.ok(Math.abs(params('melody',50,100).detuneCents)<11);
  assert.equal(params('melody',49.999,100).detuneCents,0,'tiny detune must bypass before50');
  for(const role of ['drums','bass','melody']){
    assert.equal(params(role,25,100).severity,.5);assert.deepEqual(process([tone(440,1)],rate,role,100,100),[tone(440,1)]);
    assert.deepEqual(process([tone(440,1)],rate,role,10,100),process([tone(440,1)],rate,role,100,10));
    const source=tone(440,1),near=process([source],rate,role,99.999,100)[0];assert.ok(near.every((x,i)=>Math.abs(x-source[i])<1e-7));
  }
});

// Catches phase cancellation hidden by correct near-100 and exact-100 bypasses.
test('beat50 and80 preserve low tone energy and improve actual frozen roles without gain rescue',async()=>{
  const process=fn('processBeat'),r=44100;
  for(const role of ['drums','bass']){
    const input=Float32Array.from({length:2*r},(_,i)=>.1*Math.sin(2*Math.PI*80*i/r));
    const ratios=[50,80].map(level=>rms(process([input],r,role,level,100)[0].subarray(r/4,7*r/4))/rms(input.subarray(r/4,7*r/4)));
    assert.ok(ratios[0]>.75&&ratios[1]>.9,JSON.stringify({role,ratios}));assert.ok(ratios[1]>=ratios[0],JSON.stringify({role,ratios}));
  }
  const fixture=JSON.parse(await readFile(new URL('../tools/audio/beat-skill-ladder-fixture.json',import.meta.url),'utf8'));
  for(const part of fixture.parts.filter(p=>p.role!=='vocal')){
    const decoded=decodePcm16(await readFile(new URL('../'+part.path,import.meta.url))),source=prepareSourcePcm(decoded,r,part.loopSeconds);
    const originalPower=source.reduce((s,c)=>s+rms(c)**2,0);
    const ratios=[50,80].map(level=>Math.sqrt(process(source,r,part.role,level,100).reduce((s,c)=>s+rms(c)**2,0)/originalPower));
    assert.ok(ratios[0]>.75&&ratios[1]>.9,JSON.stringify({role:part.role,ratios}));assert.ok(ratios[1]>=ratios[0],JSON.stringify({role:part.role,ratios}));
    if(part.role!=='drums'){
      // These straddle the explicitly tiny detune deadband, without requiring
      // waveform identity across the offline pitch algorithm bypass.
      const levels=[45,45.5];
      const edgeRatios=levels.map(level=>Math.sqrt(process(source,r,part.role,level,100).reduce((s,c)=>s+rms(c)**2,0)/originalPower));
      assert.ok(Math.abs(edgeRatios[1]-edgeRatios[0])<.04,JSON.stringify({role:part.role,levels,edgeRatios}));
      assert.equal(fn('beatParameters')(part.role,49.999,100).detuneCents,0);
      assert.equal(fn('beatParameters')(part.role,50,100).detuneCents,0);
    }
  }
});

const miniature=()=>({sampleRate:rate,durationSeconds:3,outputGain:.75,parts:[
  ...[['d','drums',4000],['m','melody',600],['b','bass',80],['v','vocal',440]].map(([id,role,hz])=>({id,role,channels:[tone(hz)],sourceGainDb:-3,windows:[{startBar:0,bars:1.125,sourceBar:0}]}))
]});

// Catches varying fixed layers, unsafe gain per file, non-independent dry reference and destructive writes.
test('renderer keeps clean comparison layers, independent reference, shared safe gain and deterministic read-only verification',async()=>{
  const render=fn('renderComparison'),recipe=miniature(),prior=structuredClone(recipe),out=render(recipe);
  assert.deepEqual(out.flow.map(v=>v.level),[0,10,25,50,80,100]);assert.deepEqual(out.beat.map(v=>v.level),[0,10,25,50,80,100]);
  for(const v of out.flow)assert.deepEqual(v.beatChannels,out.flow[0].beatChannels);
  for(const v of out.beat)assert.deepEqual(v.vocalChannels,out.beat[0].vocalChannels);
  assert.deepEqual(out.flow[5].channels,out.dryReference.channels);assert.deepEqual(out.beat[5].channels,out.dryReference.channels);
  for(const v of [...out.flow,...out.beat,out.dryReference])for(const c of v.channels)assert.ok(c.every(x=>Number.isFinite(x)&&Math.abs(x)<=.951));
  assert.deepEqual(recipe,prior);
  const writer=await import('../tools/render-flow-genre-curve.mjs');
  await mkdir('artifacts/flow-genre-curve-session',{recursive:true});const outputDir=await mkdtemp('artifacts/flow-genre-curve-session/test-');
  const manifest=await writer.writePreview({recipe,outputDir});
  assert.equal(manifest.variants.length,12);
  const before=await Promise.all((await readdir(outputDir)).map(async name=>[name,(await stat(outputDir+'/'+name)).mtimeMs]));
  assert.deepEqual(await writer.writePreview({recipe,outputDir,verifyOnly:true}),manifest);
  const after=await Promise.all((await readdir(outputDir)).map(async name=>[name,(await stat(outputDir+'/'+name)).mtimeMs]));assert.deepEqual(after,before);
  await assert.rejects(()=>writer.writePreview({recipe,outputDir}),/overwrite/i);
  for(const v of manifest.variants){const bytes=await readFile(outputDir+'/'+v.filename);assert.equal(createHash('sha256').update(bytes).digest('hex'),v.sha256);}
  assert.deepEqual(await readFile(outputDir+'/flow-100.wav'),await readFile(outputDir+'/dry-reference.wav'));
  assert.deepEqual(await readFile(outputDir+'/beat-100.wav'),await readFile(outputDir+'/dry-reference.wav'));
});

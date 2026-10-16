import test from 'node:test';
import assert from 'node:assert/strict';
import {transformBeatSamples,connectBeatResult} from '../src/beat-result-dsp.js';
import {transformVocalSamples} from '../src/vocal-result-dsp.js';
import {beatMixCurve} from '../src/beat-mix.js';
const profile=(skill,quality=skill,stage=0)=>({stage,seed:135,skills:{beatmaking:skill,sound:skill},sliders:[5,5,5],fit:50,quality});
const rms=a=>Math.sqrt(a.reduce((s,x)=>s+x*x,0)/a.length);
test('archived novice crushed presets also avoid digital quantization steps',()=>{
 for(const skill of [0,10,30,50]){
  const curve=beatMixCurve({version:1,skill,character:'crushed'});let jump=0;
  for(let i=24000;i<41000;i++)jump=Math.max(jump,Math.abs(curve[i+1]-curve[i]));
  assert.ok(jump<.001,'a quiet smooth input must not turn into audible quantization jumps');
 }
});
function graph(){
 const nodes=[],make=type=>{const n={type,connections:[],gain:{value:1},frequency:{value:0},Q:{value:0},delayTime:{value:0},connect(to){this.connections.push(to);},disconnect(){this.connections=[];}};nodes.push(n);return n;};
 return {nodes,sampleRate:44100,createGain:()=>make('gain'),createBiquadFilter:()=>make('filter'),createWaveShaper:()=>make('shape'),createDelay:()=>make('delay')};
}
test('novice drums move single attacks without chopping, repeating or erasing them',()=>{
 const rate=6000,input=new Float32Array(64000),starts=[];
 for(let beat=0;beat<16;beat++){const start=beat*4000+300;starts.push(start);for(let i=0;i<60;i++)input[start+i]=.3*Math.sin(Math.PI*i/60);}
 const output=transformBeatSamples(input,rate,profile(10)),attacks=[];
 let active=false;for(let i=0;i<output.length;i++){const hit=Math.abs(output[i])>.015;if(hit&&!active)attacks.push(i);active=hit;}
 assert.equal(attacks.length,16,'one original hit must remain one hit, not a stutter or doubled dry/wet attack');
 assert.ok(attacks.some((v,i)=>Math.abs(v-starts[i])>60),'novice timing must be audibly uneven');
 assert.ok(attacks.every((v,i)=>Math.abs(v-starts[i])<550),'mistakes stay close to the intended beat');
 assert.equal(output.length,64000);assert.ok(rms(output)>.01);
});
test('all novice layers stay dry regardless of lucky decisions; post-production is the only early echo',()=>{
 for(const skill of [0,10,30,49,50])for(const stage of [0,1,2]){
  const c=graph(),fx=connectBeatResult(c,profile(skill,80,stage),{});
  assert.equal(c.nodes.filter(n=>n.type==='delay').length,0,'saved skill, not a lucky quality, gates creative delay');fx.dispose();
 }
 const c=graph(),fx=connectBeatResult(c,{...profile(10),postGain:2},{});
 assert.equal(c.nodes.filter(n=>n.type==='delay').length,1,'mixing can add one quiet echo');fx.dispose();
 assert.equal(c.nodes.find(n=>n.type==='delay').delayTime.value,1/3,'post echo is an eighth note at90 BPM, not a rapid stutter');
});
test('creative delay appears above 50 and is quieter again near mastery',()=>{
 const amount=skill=>{const c=graph(),fx=connectBeatResult(c,profile(skill,60),{}),delay=c.nodes.find(n=>n.type==='delay');
  const wet=delay?.connections.filter(n=>n.type==='gain').find(n=>!n.connections.includes(delay));const value=wet?.gain.value??0;fx.dispose();return value;};
 assert.equal(amount(50),0);assert.ok(amount(65)>amount(51));assert.ok(amount(65)>amount(85));assert.ok(amount(85)>amount(99));assert.equal(amount(100),0);
 assert.ok(amount(65)<.15,'mid-skill effects are much subtler than the old novice preset');
});
test('post-production adds a restrained vocal echo without changing the source or hardware ceiling',()=>{
 const rate=12000,input=Float32Array.from({length:24000},(_,i)=>i>=2400&&i<3360?.15*Math.sin(i/rate*2*Math.PI*3400):0),saved=input.slice();
 const p={quality:44,seed:1,skills:{flow:100,sound:100,musicality:100,confidence:100},postGain:0};
 const dry=transformVocalSamples(input,rate,p),post=transformVocalSamples(input,rate,{...p,postGain:4});
 assert.ok(rms(post.subarray(6100,7400))>rms(dry.subarray(6100,7400))*10+1e-6,'echo is audible only after post-production');
 assert.ok(rms(post)<rms(dry)*1.4,'post is a small improvement, not a volume rescue');
 assert.deepEqual(input,saved);assert.equal(post.length,input.length);assert.ok(post.every(x=>Number.isFinite(x)&&Math.abs(x)<=.3));
});

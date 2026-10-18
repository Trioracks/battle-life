import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir,mkdtemp,stat,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const api=await import('../tools/audio/gans-mix-preview.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
const fn=name=>{assert.equal(typeof api[name],'function',`missing local GANS behavior: ${name}`);return api[name];};
const rate=12000,bar=8/3;
const tone=(hz,seconds,gain=.05)=>Float32Array.from({length:Math.round(seconds*rate)},(_,i)=>gain*Math.sin(2*Math.PI*hz*i/rate));
function recipe(){const voice=new Float32Array(Math.round(5.1*rate));for(const [a,b] of [[.2,1.2],[1.5,2.6],[2.9,3.9],[4.2,5.02]])for(let i=Math.round(a*rate);i<b*rate;i++)voice[i]=.1*Math.sin(2*Math.PI*440*i/rate);return {sampleRate:rate,voice:{id:'gans-test-take',path:'fixture-only',sourceGainDb:-3,channels:[voice]},parts:[['d','drums',3000],['m','melody',600],['b','bass',80]].map(([id,role,hz])=>({id,role,sourceGainDb:-3,channels:[tone(hz,bar*4)]})),flow:25,beatmaking:50,genreXP:100,seed:33};}
const rms=channels=>Math.sqrt(channels.reduce((s,c)=>s+c.reduce((a,x)=>a+x*x,0),0)/(channels.length*channels[0].length));

test('GANS refuses a take that cannot fit two complete main-section performances',()=>{
 const render=fn('renderGansMix'),input=recipe();input.voice.channels=[tone(440,5.6)];assert.throws(()=>render(input),/fit|long|duration/i);
});

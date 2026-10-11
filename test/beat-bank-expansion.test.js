import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as bank from '../src/beat-beginner-bank.js';
const hash=buffer=>createHash('sha256').update(buffer).digest('hex');
const load=path=>import(path).catch(error=>{if(error.code!=='ERR_MODULE_NOT_FOUND')throw error;return {};});
const renderer=await load('../tools/audio/expanded-patterns.mjs');
const sourceAudio=await load('../tools/audio/source-loop.mjs');

test('selection reaches exactly 90 different complete beat assemblies without relying on vocals',()=>{
  const picks=Array.from({length:90},(_,i)=>bank.chooseBeginnerParts(()=> (i+.5)/90));
  assert.equal(new Set(picks.map(p=>JSON.stringify(p))).size,90);assert.equal(bank.BEGINNER_RECIPES?.length,90);
  for(const pick of picks)for(const [field,kind] of [['drumsId','drums'],['themeId','theme'],['arrangementId','arrangement']])assert.equal(bank.beginnerById(pick[field])?.kind,kind);
  assert.equal(new Set(picks.map(p=>p.drumsId)).size,30);assert.equal(new Set(picks.map(p=>p.themeId)).size,35);assert.equal(new Set(picks.map(p=>p.arrangementId)).size,30);
  assert.ok(picks.some(p=>p.themeId==='beginner-theme-16'),'original Track 1 remains available in new assemblies');
});

test('authored groove families include dance, coincidence, missing kick/snare, and sparse rhythms',()=>{
  assert.equal(typeof renderer.expandedEvents,'function');
  const patterns=Array.from({length:30},(_,index)=>renderer.expandedEvents('drums',index));
  const kicks=events=>events.filter(e=>e.voice==='kick').map(e=>e.beat),snares=events=>events.filter(e=>e.voice==='snare').map(e=>e.beat);
  assert.ok(patterns.some(p=>[0,1,2,3].every(t=>kicks(p).includes(t))));assert.ok(patterns.some(p=>!snares(p).length));assert.ok(patterns.some(p=>!kicks(p).length));assert.ok(patterns.some(p=>kicks(p).some(t=>snares(p).includes(t))));
  assert.ok(patterns.some(p=>p.filter(e=>e.beat<4).length<=6));assert.ok(patterns.some(p=>p.filter(e=>e.voice==='openhat').length>=12));
  const bass=Array.from({length:30},(_,i)=>renderer.expandedEvents('arrangement',i));
  assert.ok(bass.some(p=>p.filter(e=>e.voice.startsWith('bass')&&e.beat<4).length>=16));assert.ok(bass.some(p=>p.some(e=>e.voice.startsWith('bass')&&e.duration>=3.5)));assert.ok(bass.some(p=>p.some(e=>e.voice.startsWith('bass')&&e.beat%1===.75)));
});

test('new renderings are deterministic non-volume variants with bounded PCM and clean loop seams',()=>{
  assert.equal(typeof renderer.renderExpandedPart,'function');
  for(const kind of ['drums','theme','arrangement']){
    const hashes=new Set(),activity=new Set();
    for(let index=0;index<30;index++){
      const pcm=renderer.renderExpandedPart(kind,index,8000);assert.equal(pcm.length,85333);assert.deepEqual(pcm,renderer.renderExpandedPart(kind,index,8000));
      let power=0,peak=0;for(const value of pcm){assert.ok(Number.isFinite(value));power+=value*value;peak=Math.max(peak,Math.abs(value));}
      assert.ok(peak<=.301&&Math.sqrt(power/pcm.length)>.009,`${kind}/${index} must be audible with mix headroom`);assert.equal(pcm[0],0);assert.equal(pcm.at(-1),0);
      hashes.add(hash(new Uint8Array(Float32Array.from(pcm,x=>x/peak).buffer)));activity.add(renderer.expandedEvents(kind,index).map(e=>`${e.beat}:${e.duration}:${e.voice}`).join('|'));
    }
    assert.equal(hashes.size,30,kind+' must change its sound, not only its volume');assert.ok(activity.size>=24,kind+' must vary timing or timbre, not just its noise seed');
  }
});

test('source conversion trims four bars from zero, preserves stereo, and rejects silent or short material',()=>{
  assert.equal(typeof sourceAudio.deriveSourceLoop,'function');
  const rate=48000,frames=rate*12,left=new Float32Array(frames),right=new Float32Array(frames);for(let i=0;i<frames;i++){left[i]=.1*Math.sin(i*.043);right[i]=.07*Math.sin(i*.051);}
  const loop=sourceAudio.deriveSourceLoop({sampleRate:rate,channels:[left,right]});assert.equal(loop.sampleRate,44100);assert.equal(loop.channels.length,2);assert.equal(loop.channels[0].length,470400);assert.notDeepEqual(loop.channels[0],loop.channels[1]);
  for(const channel of loop.channels){assert.equal(channel[0],0);assert.equal(channel.at(-1),0);}
  assert.throws(()=>sourceAudio.deriveSourceLoop({sampleRate:rate,channels:[new Float32Array(frames)]}),/silent/i);assert.throws(()=>sourceAudio.deriveSourceLoop({sampleRate:rate,channels:[new Float32Array(8000)]}),/short/i);
});

test('shipped expansion assets verify all 90 audible assemblies and user source provenance',async()=>{
  assert.equal(bank.BEGINNER_RECIPES?.length,90);const manifest=JSON.parse(await readFile(new URL('../assets/audio/ft/beginner-v2/manifest.json',import.meta.url),'utf8'));assert.equal(manifest.parts.length,94);assert.equal(manifest.recipes.length,90);
  const decoded=new Map();
  for(const part of manifest.parts){
    const wav=await readFile(new URL('../'+part.path,import.meta.url));assert.equal(hash(wav),part.sha256);assert.equal(wav.readUInt16LE(20),1);assert.equal(wav.readUInt32LE(24),44100);assert.equal(wav.readUInt16LE(34),16);
    const channels=wav.readUInt16LE(22);assert.equal(wav.readUInt32LE(40),470400*channels*2);const points=new Float32Array(4704);let power=0,peak=0;
    for(let frame=0;frame<470400;frame++){let mono=0;for(let ch=0;ch<channels;ch++){const v=wav.readInt16LE(44+(frame*channels+ch)*2)/32768;mono+=v/channels;peak=Math.max(peak,Math.abs(v));power+=v*v/channels;}if(frame%100===0)points[frame/100]=mono;}
    assert.ok(peak<=.301&&Math.sqrt(power/470400)>.009,part.id);decoded.set(part.id,points);if(part.source){assert.equal(hash(await readFile(new URL('../'+part.source,import.meta.url))),part.sourceHash);assert.ok(part.sourceFrames>512000);}
  }
  assert.equal(manifest.parts.filter(p=>p.source).length,4);const mixes=new Set();
  const legacy=await readFile(new URL('../assets/audio/ft/beginner-v1/theme/16.wav',import.meta.url));
  decoded.set('beginner-theme-16',Float32Array.from({length:4704},(_,i)=>(legacy.readInt16LE(44+i*400)+legacy.readInt16LE(46+i*400))/65536));
  for(const recipe of bank.BEGINNER_RECIPES){const layers=[recipe.drumsId,recipe.themeId,recipe.arrangementId].map(id=>decoded.get(id));assert.ok(layers.every(Boolean));const mix=Float32Array.from(layers[0],(sample,i)=>sample+layers[1][i]+layers[2][i]);mixes.add(hash(new Uint8Array(mix.buffer)));}
  assert.equal(mixes.size,90,'actual instrument mixes must differ without any vocal layer');
});

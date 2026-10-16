import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {localAssetPath} from '../helpers/local-assets.js';
import * as bank from '../../src/beat-beginner-bank.js';
const hash=buffer=>createHash('sha256').update(buffer).digest('hex');

test('shipped expansion assets verify all 90 audible assemblies and user source provenance',async()=>{
  assert.equal(bank.BEGINNER_RECIPES?.length,90);const manifest=JSON.parse(await readFile(new URL('../../assets/audio/ft/beginner-v2/manifest.json',import.meta.url),'utf8'));assert.equal(manifest.parts.length,94);assert.equal(manifest.recipes.length,90);
  const decoded=new Map();
  for(const part of manifest.parts){
    const wav=await readFile(localAssetPath(part.path));assert.equal(hash(wav),part.sha256);assert.equal(wav.readUInt16LE(20),1);assert.equal(wav.readUInt32LE(24),44100);assert.equal(wav.readUInt16LE(34),16);
    const channels=wav.readUInt16LE(22);assert.equal(wav.readUInt32LE(40),470400*channels*2);const points=new Float32Array(4704);let power=0,peak=0;
    for(let frame=0;frame<470400;frame++){let mono=0;for(let ch=0;ch<channels;ch++){const v=wav.readInt16LE(44+(frame*channels+ch)*2)/32768;mono+=v/channels;peak=Math.max(peak,Math.abs(v));power+=v*v/channels;}if(frame%100===0)points[frame/100]=mono;}
    assert.ok(peak<=.301&&Math.sqrt(power/470400)>.009,part.id);decoded.set(part.id,points);if(part.source){assert.equal(hash(await readFile(localAssetPath(part.source))),part.sourceHash);assert.ok(part.sourceFrames>512000);}
  }
  assert.equal(manifest.parts.filter(p=>p.source).length,4);const mixes=new Set();
  const legacy=await readFile(localAssetPath('assets/audio/ft/beginner-v1/theme/16.wav'));
  decoded.set('beginner-theme-16',Float32Array.from({length:4704},(_,i)=>(legacy.readInt16LE(44+i*400)+legacy.readInt16LE(46+i*400))/65536));
  for(const recipe of bank.BEGINNER_RECIPES){const layers=[recipe.drumsId,recipe.themeId,recipe.arrangementId].map(id=>decoded.get(id));assert.ok(layers.every(Boolean));const mix=Float32Array.from(layers[0],(sample,i)=>sample+layers[1][i]+layers[2][i]);mixes.add(hash(new Uint8Array(mix.buffer)));}
  assert.equal(mixes.size,90,'actual instrument mixes must differ without any vocal layer');
});

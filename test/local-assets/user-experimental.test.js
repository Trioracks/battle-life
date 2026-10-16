import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {localAssetPath} from '../helpers/local-assets.js';
import {decodePcm16,pcmStatistics} from '../../tools/audio/source-loop.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');

test('28 source archives retain raw bytes and decoded four-bar stereo PCM',async()=>{
 const manifest=JSON.parse(await readFile('assets/audio/ft/user-experimental-v1/manifest.json'));
 for(const p of manifest.parts){
  assert.equal(hash(await readFile(localAssetPath(p.source))),p.sourceHash,p.originalName);
  const wav=await readFile(localAssetPath(p.path));assert.equal(hash(wav),p.sha256);const pcm=decodePcm16(wav);
  assert.equal(pcm.sampleRate,44100);assert.equal(pcm.channels.length,2);assert.equal(pcm.channels[0].length,470400);
  const stats=pcmStatistics(pcm.channels);assert.ok(stats.peak<1&&stats.rms>.0001);
  for(let bar=0;bar<4;bar++)assert.ok(pcmStatistics(pcm.channels.map(c=>c.subarray(bar*117600,(bar+1)*117600))).rms>.0001,'no padded bar');
  for(const c of pcm.channels){assert.equal(c[0],0);assert.equal(c.at(-1),0);assert.ok(Math.abs(c[235200]-c[235199])<.005,'internal repeat seam');}
 }
});

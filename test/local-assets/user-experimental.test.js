import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {localAssetPath} from '../helpers/local-assets.js';
import * as bank from '../../src/beat-beginner-bank.js';
import {decodePcm16,pcmStatistics} from '../../tools/audio/source-loop.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');

test('28 source archives retain raw bytes, evidence and unique four-bar stereo assets',async()=>{
 assert.equal(bank.USER_EXPERIMENTAL_BANK?.length,28,'new bank registered');
 const manifest=JSON.parse(await readFile('assets/audio/ft/user-experimental-v1/manifest.json'));
 assert.equal(manifest.parts.length,28);assert.equal(new Set(manifest.parts.map(p=>p.sourceHash)).size,28);
 assert.equal(new Set(manifest.parts.map(p=>p.sha256)).size,28);
 for(const p of manifest.parts){
  assert.equal(hash(await readFile(localAssetPath(p.source))),p.sourceHash,p.originalName);
  const wav=await readFile(localAssetPath(p.path));assert.equal(hash(wav),p.sha256);const pcm=decodePcm16(wav);
  assert.equal(pcm.sampleRate,44100);assert.equal(pcm.channels.length,2);assert.equal(pcm.channels[0].length,470400);
  const stats=pcmStatistics(pcm.channels);assert.ok(stats.peak<1&&stats.rms>.0001);
  for(let bar=0;bar<4;bar++)assert.ok(pcmStatistics(pcm.channels.map(c=>c.subarray(bar*117600,(bar+1)*117600))).rms>.0001,'no padded bar');
  for(const c of pcm.channels){assert.equal(c[0],0);assert.equal(c.at(-1),0);assert.ok(Math.abs(c[235200]-c[235199])<.005,'internal repeat seam');}
  assert.ok(p.evidence.timing&&p.evidence.role&&p.evidence.key);assert.equal(p.cycleBars,2);
  assert.equal(bank.beginnerById(p.id).kind,p.kind);assert.equal(bank.beginnerById(p.id).key,p.key);
  assert.ok(p.calibration.gainDb>=-40&&p.calibration.gainDb<=12);assert.ok(p.calibration.after.truePeak<=-9.95);
  if(!p.calibration.peakLimited)assert.ok(Math.abs(p.calibration.after.lufs-({drums:-30,theme:-27,arrangement:-28.5})[p.kind])<.15);
 }
 assert.notEqual(manifest.parts.find(p=>p.originalName==='untitled - Track 16.wav').key,null,'low harmonic voice is pitched');
});

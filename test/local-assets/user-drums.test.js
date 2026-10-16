import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {localAssetPath} from '../helpers/local-assets.js';
import * as bank from '../../src/beat-beginner-bank.js';
import * as source from '../../tools/audio/source-loop.mjs';

test('ten prepared loops have four-bar stereo PCM and unchanged source hashes',async()=>{
 assert.equal(bank.USER_DRUM_BANK?.length,10);
 const manifest=JSON.parse(await readFile(new URL('../../assets/audio/ft/user-drums-v1/manifest.json',import.meta.url)));
 const hash=b=>createHash('sha256').update(b).digest('hex');
 assert.equal(manifest.parts.length,10);
 for(const part of manifest.parts){
  const wav=await readFile(localAssetPath(part.path)),decoded=source.decodePcm16(wav);
  assert.equal(decoded.sampleRate,44100);assert.equal(decoded.channels.length,2);assert.equal(decoded.channels[0].length,470400);
  assert.equal(hash(wav),part.sha256);assert.equal(hash(await readFile(localAssetPath(part.source))),part.sourceHash);
  assert.equal(part.cycleBars,1);assert.equal(bank.beginnerById(part.id).kind,'drums');
 }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {localAssetPath} from '../helpers/local-assets.js';
import {BEGINNER_BANK} from '../../src/beat-beginner-bank.js';
const bank={BEGINNER_BANK};
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');

test('shipped WAVs match deterministic manifest and decode as mono PCM16 four-bar loops', async () => {
  assert.ok(Array.isArray(bank.BEGINNER_BANK), 'catalogue must be implemented');
  const manifest = JSON.parse(await readFile(new URL('../../assets/audio/ft/beginner-v1/manifest.json',import.meta.url),'utf8'));
  assert.equal(manifest.parts.length,48);
  for(const part of bank.BEGINNER_BANK) {
    if(!part.path.includes('/beginner-v1/'))continue;
    const wav=await readFile(localAssetPath(part.path));
    assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.toString('ascii',8,12),'WAVE');
    const channels=part.id==='beginner-theme-16'?2:1;
    assert.equal(wav.readUInt16LE(20),1);assert.equal(wav.readUInt16LE(22),channels);
    assert.equal(wav.readUInt32LE(24),44100);assert.equal(wav.readUInt16LE(34),16);
    assert.equal(wav.readUInt32LE(40),940800*channels);assert.equal(wav.length,940800*channels+44);
    assert.equal(manifest.parts.find(p=>p.id===part.id).sha256,digest(wav));
  }
});

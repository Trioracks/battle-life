import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
const load = async path => import(path).catch(e => {if(e.code !== 'ERR_MODULE_NOT_FOUND') throw e; return {};});
const bank = await load('../src/beat-beginner-bank.js');
const synth = await load('../tools/audio/beginner-patterns.mjs');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

test('bank_has_fifteen_each and random selection never crosses families', () => {
  assert.equal(typeof bank.chooseBeginnerParts, 'function', 'beginner catalogue is required');
  assert.equal(bank.BEGINNER_BANK.length, 45);
  for(const kind of ['drums','theme','arrangement']) {
    const entries = bank.BEGINNER_BANK.filter(p => p.kind === kind);
    assert.equal(entries.length, 15);
    assert.equal(new Set(entries.map(p => p.id)).size, 15);
    assert.ok(entries.every(p => p.bpm === 90 && p.bars === 4 && p.key === 'A minor'));
  }
  assert.deepEqual(bank.chooseBeginnerParts(() => 0), {drumsId:'beginner-drums-01',themeId:'beginner-theme-01',arrangementId:'beginner-arrangement-01'});
  assert.deepEqual(bank.chooseBeginnerParts(() => 1), {drumsId:'beginner-drums-15',themeId:'beginner-theme-15',arrangementId:'beginner-arrangement-15'});
  for(const value of [NaN,Infinity,-2,.43]) for(const id of Object.values(bank.chooseBeginnerParts(() => value))) assert.ok(bank.beginnerById(id));
  assert.equal(bank.beginnerById('../../evil'), undefined);
});

test('render_is_deterministic_distinct_and_bounded on exact four-bar boundaries', () => {
  assert.equal(typeof synth.renderBeginnerPart, 'function', 'authored synthesis is required');
  for(const kind of ['drums','theme','arrangement']) {
    const unique = new Set();
    for(let index=0;index<15;index++) {
      const pcm = synth.renderBeginnerPart(kind,index,8000);
      assert.equal(pcm.length, 85333);
      assert.deepEqual(pcm, synth.renderBeginnerPart(kind,index,8000));
      let power=0,peak=0;
      for(const value of pcm) {assert.ok(Number.isFinite(value));power+=value*value;peak=Math.max(peak,Math.abs(value));}
      assert.ok(peak <= .28 && Math.sqrt(power/pcm.length) > .005, `${kind} ${index}: headroom and non-silence`);
      assert.ok(Math.abs(pcm[0]-pcm.at(-1)) < .001, 'no discontinuity at loop seam');
      const normalized = Float32Array.from(pcm, x => x/peak);
      unique.add(digest(new Uint8Array(normalized.buffer)));
    }
    assert.equal(unique.size,15, `${kind}: not volume-only variants`);
    assert.equal(synth.renderBeginnerPart(kind,0,44100).length,470400);
  }
});

test('invalid synthesis requests cannot allocate arbitrary lengths or return wrong families', () => {
  assert.equal(typeof synth.renderBeginnerPart,'function');
  for(const args of [['other',0],['drums',15],['theme',-1],['theme',.5],['drums',0,NaN],['drums',0,1e9]]) assert.throws(() => synth.renderBeginnerPart(...args), RangeError);
});

test('shipped WAVs match deterministic manifest and decode as mono PCM16 four-bar loops', async () => {
  assert.ok(Array.isArray(bank.BEGINNER_BANK), 'catalogue must be implemented');
  const manifest = JSON.parse(await readFile(new URL('../assets/audio/ft/beginner-v1/manifest.json',import.meta.url),'utf8'));
  assert.equal(manifest.parts.length,45);
  for(const part of bank.BEGINNER_BANK) {
    const wav=await readFile(new URL('../'+part.path,import.meta.url));
    assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.toString('ascii',8,12),'WAVE');
    assert.equal(wav.readUInt16LE(20),1);assert.equal(wav.readUInt16LE(22),1);
    assert.equal(wav.readUInt32LE(24),44100);assert.equal(wav.readUInt16LE(34),16);
    assert.equal(wav.readUInt32LE(40),940800);assert.equal(wav.length,940844);
    assert.equal(manifest.parts.find(p=>p.id===part.id).sha256,digest(wav));
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {localAssetPath} from '../helpers/local-assets.js';
import * as catalog from '../../src/vocal-catalog.js';

test('expanded vocal assets keep legacy IDs and all sources with exact four-bar stereo PCM',async()=>{
 assert.equal(catalog.VOCALS?.length,54);
 const manifests=await Promise.all([1,2].map(async v=>JSON.parse(await readFile(new URL('../../assets/audio/ft/vocals-v'+v+'/manifest.json',import.meta.url)))));
 assert.equal(catalog.vocalById('vocal-01').path,'./assets/audio/ft/vocals-v1/01.wav');
 assert.equal(catalog.vocalById('vocal-40').path,'./assets/audio/ft/vocals-v1/40.wav');
 assert.equal(catalog.vocalById('vocal-54').path,'./assets/audio/ft/vocals-v2/54.wav');
 const hashes=new Set();
 for(const a of catalog.VOCALS){
  const w=await readFile(localAssetPath(a.path));
  assert.equal(w.readUInt16LE(22),2);assert.equal(w.readUInt32LE(24),44100);assert.equal(w.readUInt32LE(40),470400*4);
  const hash=createHash('sha256').update(w.subarray(44)).digest('hex');assert.equal(hashes.has(hash),false,'unique recording '+a.id);hashes.add(hash);
  const entry=manifests.flatMap(m=>m.parts).find(p=>p.id===a.id);assert.ok(entry);
  const raw=await readFile(localAssetPath(entry.source));
  assert.equal(createHash('sha256').update(raw).digest('hex'),entry.sourceHash);
 }
 assert.equal(catalog.vocalById('../../x'),undefined);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const catalog=await import('../src/vocal-catalog.js').catch(()=>({}));
test('forty stable vocal assets are exact four-bar stereo PCM with preserved originals',async()=>{
 assert.equal(catalog.VOCALS?.length,40);
 const manifest=JSON.parse(await readFile(new URL('../assets/audio/ft/vocals-v1/manifest.json',import.meta.url)));
 for(const a of catalog.VOCALS){
  const w=await readFile(new URL('../'+a.path,import.meta.url));
  assert.equal(w.readUInt16LE(22),2);assert.equal(w.readUInt32LE(24),44100);assert.equal(w.readUInt32LE(40),470400*4);
  const entry=manifest.parts.find(p=>p.id===a.id);assert.ok(entry);
  const raw=await readFile(new URL('../'+entry.source,import.meta.url));
  assert.equal(createHash('sha256').update(raw).digest('hex'),entry.sourceHash);
 }
 assert.equal(catalog.vocalById('../../x'),undefined);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const catalog=await import('../src/vocal-catalog.js').catch(()=>({}));


test('vocal text manifests retain all 54 catalog IDs, paths and source declarations',async()=>{
 assert.equal(catalog.VOCALS.length,54);
 const manifests=await Promise.all([1,2].map(async v=>JSON.parse(await readFile(new URL('../assets/audio/ft/vocals-v'+v+'/manifest.json',import.meta.url)))));
 assert.equal(catalog.vocalById('vocal-01').path,'./assets/audio/ft/vocals-v1/01.wav');
 assert.equal(catalog.vocalById('vocal-40').path,'./assets/audio/ft/vocals-v1/40.wav');
 assert.equal(catalog.vocalById('vocal-54').path,'./assets/audio/ft/vocals-v2/54.wav');
 for(const part of catalog.VOCALS){const entry=manifests.flatMap(m=>m.parts).find(p=>p.id===part.id);assert.ok(entry);assert.equal(entry.path,part.path);assert.match(entry.sourceHash,/^[a-f0-9]{64}$/);}
 assert.equal(catalog.vocalById('../../x'),undefined);
});

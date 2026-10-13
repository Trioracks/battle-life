import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('current entry and rebuilt footwear assets have fresh coherent cache revisions',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8'),scene=await readFile(new URL('../src/apartment-v3-scene.js',import.meta.url),'utf8');
 assert.match(html,/apartment-app\.js\?rev=41/);assert.match(html,/social-network\.css\?rev=41/);
 assert.ok(scene.includes("config.geometry+'?rev=40'"));assert.ok(scene.includes("config.rig+'?rev=40'"));assert.doesNotMatch(html,/rev=38/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('browser QA validates the current entry cohort for every JS CSS and Worker assertion',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 const current=html.match(/apartment-app\.js\?rev=(\d+)/)[1];
 const qa=await readFile(new URL('../tools/verify-public-preview.mjs',import.meta.url),'utf8');
 const assertions=[...qa.matchAll(/searchParams\.get\('rev'\)==='(\d+)'/g)];
 assert.equal(assertions.length,3);
 for(const match of assertions)assert.equal(match[1],current,'QA must verify the shipped cohort');
 const reported=qa.match(/canonicalRevision:(\d+)/);assert.equal(reported?.[1],current);
});

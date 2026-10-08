import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('creator markup has three labelled sections and no duplicate controls',()=>{
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
 for(const id of ['appearance-tab','clothing-tab','stats-tab','creator-categories','appearance-fields','preview-stage','character-name','creator-form'])assert.equal(ids.filter(x=>x===id).length,1,id);
 for(const id of ['appearance-tab','clothing-tab','stats-tab','cancel-creator','next-step']){
  const tag=html.match(new RegExp('<button[^>]*id="'+id+'"[^>]*>'))?.[0];assert.match(tag??'',/type="button"/);
 }
 assert.match(html,/<button[^>]*id="start-game"[^>]*form="creator-form"[^>]*type="submit"/);
 assert.match(html,/id="character-name"[^>]*aria-describedby="name-error"/);
});

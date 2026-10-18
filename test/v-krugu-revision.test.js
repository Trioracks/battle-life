import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
test('current entry and rebuilt footwear assets have fresh coherent cache revisions',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8'),scene=await readFile(new URL('../src/apartment-v3-scene.js',import.meta.url),'utf8');
 assert.match(html,/apartment-app\.js\?rev=45/);assert.match(html,/social-network\.css\?rev=45/);
 assert.ok(scene.includes("config.geometry+'?rev=40'"));assert.ok(scene.includes("config.rig+'?rev=40'"));assert.doesNotMatch(html,/rev=38/);
});

test('every reachable local import and Worker resolves to the current package including the additive source bank',async()=>{
 const visited=new Set(),workers=[];
 async function visit(file){
  if(visited.has(file))return;visited.add(file);
  const source=await readFile(new URL('../'+file,import.meta.url),'utf8');
  for(const match of source.matchAll(/(?:from\s*|import\s*\(\s*|new URL\(\s*)['"](\.\.?\/[^'"]+\.js(?:\?[^'"]*)?)['"]/g)){
   const [relative,query]=match[1].split('?'),target=path.posix.normalize(path.posix.join(path.posix.dirname(file),relative));
   if(!target.startsWith('src/'))continue;
   assert.equal(query,'rev=45',file+' → '+match[1]);
   if(match[0].startsWith('new URL'))workers.push(target);
   await visit(target);
  }
 }
 await visit('src/apartment-app.js');
 assert.deepEqual(workers.toSorted(),['src/beat-pcm-worker.js','src/social-worker.js']);
 for(const module of ['beat-user-experimental-bank','source-levels','source-levels-user-experimental-v1'])assert.ok(visited.has('src/'+module+'.js'),module+' is reachable');
});

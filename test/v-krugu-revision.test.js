import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {goblinClientGraph} from '../tools/goblin-client-revision.mjs';
test('current entry and rebuilt footwear assets have fresh coherent cache revisions',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8'),scene=await readFile(new URL('../src/apartment-v3-scene.js',import.meta.url),'utf8');
 assert.match(html,/apartment-app\.js\?rev=57/);assert.match(html,/creator-v12\.css\?rev=48/);assert.match(html,/social-network\.css\?rev=57/);
 assert.ok(scene.includes("config.geometry+'?rev=40'"));assert.ok(scene.includes("config.rig+'?rev=56'"));assert.doesNotMatch(html,/rev=38/);
});

test('every reachable local import and Worker resolves to the current package including the additive source bank',async()=>{
 const visited=new Set(),workers=[],canonical=new Map();
 async function visit(file){
  if(visited.has(file))return;visited.add(file);
  const source=await readFile(new URL('../'+file,import.meta.url),'utf8');
  for(const match of source.matchAll(/(?:from\s*|import\s*\(\s*|new URL\(\s*)['"](\.\.?\/[^'"]+\.js(?:\?[^'"]*)?)['"]/g)){
   const [relative,query]=match[1].split('?'),target=path.posix.normalize(path.posix.join(path.posix.dirname(file),relative));
   if(!target.startsWith('src/'))continue;
   assert.match(query,/^rev=(43|45|46|47|48|49|50|51|52|53|54|55|56|57)$/,file+' → '+match[1]);
   if(canonical.has(target))assert.equal(query,canonical.get(target),'one canonical URL per module: '+target);canonical.set(target,query);
   if(match[0].startsWith('new URL'))workers.push(target);
   await visit(target);
  }
 }
 await visit('src/apartment-app.js');
 assert.deepEqual(workers.toSorted(),['src/beat-pcm-worker.js','src/social-worker.js']);
 for(const module of ['beat-user-experimental-bank','source-levels','source-levels-user-experimental-v1','beat-jura-experimental-bank','npc-vocal-catalog'])assert.ok(visited.has('src/'+module+'.js'),module+' is reachable');
 assert.equal(canonical.get('src/beat-jura-experimental-bank.js'),'rev=47','unchanged bank retains revision');
 const {affected}=await goblinClientGraph();
 for(const module of ['source-levels','beat-beginner-bank','npc-vocal-catalog','battle-npc','beat-audio','beat-pcm-worker','social-worker','character-voice-selector','vocal-catalog','vocal-production','vocal-result','avatar-v3-profile','virtual-pc-state','pc-audio-exports','track-version-audio'])assert.equal(canonical.get('src/'+module+'.js'),affected.has('src/'+module+'.js')?'rev=57':'rev=49',module+' invalidates its release graph');
 for(const file of affected)if(file!=='src/apartment-app.js')assert.equal(canonical.get(file),'rev=57',file);
});

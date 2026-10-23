import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import path from 'node:path';

test('home integration invalidates every changed dependency and its importers with one canonical URL',async()=>{
 const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
 const changed=new Set(`apartment-v3-animation beat-work-view virtual-pc-window-state virtual-pc-sounds apartment-app apartment-switch-style apartment-v3-creator-session apartment-v3-creator apartment-v3-new-game apartment-v3-runtime apartment-v3-scene apartment-v3-time avatar-v3-profile beat-names beat-production beat-studio-view character-speech ft-studio-view home-calendar home-food home-needs-view home-profile-migration home-wardrobe-view home-wardrobe pc-software-catalog pc-software-view pc-software sound-cues underweb-view virtual-pc-catalog virtual-pc-explorer-view virtual-pc-explorer virtual-pc-lifecycle virtual-pc-runtime virtual-pc-shell virtual-pc-state virtual-pc-ui`.split(' ').map(name=>'src/'+name+'.js'));
 const graph=new Map();
 for(const name of ['vocal-catalog','vocal-result','vocal-production','vocal-result-dsp','recording-studio-view','beat-beginner-bank','beat-work-audio'])changed.add('src/'+name+'.js');
 for(const name of ['beat-audio','beat-playback','beat-mix','beat-result','beat-result-dsp','apartment-v3-camera','apartment-v3-computer','virtual-pc-icons','home-creative-work','lyric-production','lyric-work-audio','rap-notebook-view','underweb-community','underweb-community-view','underweb-news','underweb-news-data','underweb-news-view'])changed.add('src/'+name+'.js');
 async function visit(file){
  if(graph.has(file))return;
  const imports=[...(await read(file)).matchAll(/(?:from\s*|import\s*\(\s*)['"](\.\.?\/[^'"]+\.js(?:\?[^'"]*)?)['"]/g)].map(match=>{
   const [relative,query='']=match[1].split('?');
   return {file:path.posix.normalize(path.posix.join(path.posix.dirname(file),relative)),query};
  });
  graph.set(file,imports);
  for(const dependency of imports)await visit(dependency.file);
 }
 await visit('src/apartment-app.js');
 const affected=new Set(changed);let size;
 do{size=affected.size;for(const [file,imports]of graph)if(imports.some(dependency=>affected.has(dependency.file)))affected.add(file);}while(affected.size!==size);
 const html=await read('index.html');
 assert.match(html,/apartment-app\.js\?rev=57/);
 for(const style of ['apartment-v3','creator-v12','desktop-apps','rap-notebook','virtual-pc','social-network','phone-hud'])assert.ok(html.includes(style+'.css?rev=57'),style+' must invalidate changed styles');
 assert.ok((await read('desktop-apps.css')).includes('underweb-world.css?rev=57'));
 const canonical=new Map();
 for(const [file,imports]of graph)for(const dependency of imports){
  if(!dependency.file.startsWith('src/'))continue;
  assert.equal(dependency.query,'rev=57',file+' must load canonical '+dependency.file);
  const previous=canonical.get(dependency.file);if(previous)assert.equal(previous,dependency.query);canonical.set(dependency.file,dependency.query);
 }
 for(const file of changed)assert.ok(graph.has(file),file+' is covered by the live entry graph');
 for(const name of ['social-view','social-runtime','social-result-view','social-result-reaction','judge-comments','judge-evaluation','battle-knowledge','phone-hud','track-version'])assert.ok(graph.has('src/'+name+'.js'),name+' must be live');
 assert.ok(canonical.size>=120,'covers full application, not only new files');
});

test('HTML loads the new versioned apartment entry; legacy campaign remains accessible',async()=>{
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/src="\.\/src\/apartment-app\.js\?rev=[^"]+"/);
  assert.match(html,/href="\.\/virtual-pc\.css\?rev=[^"]+"/);
  assert.match(html,/<section id="virtual-pc" hidden/);
  await access(new URL('../src/apartment-app.js?rev=57',import.meta.url));
  const legacy=await readFile(new URL('../legacy.html',import.meta.url),'utf8');
  assert.match(legacy,/id="creator-modal"/);
  assert.match(legacy,/src="\.\/src\/main\.js\?rev=[^"]+"/);
});

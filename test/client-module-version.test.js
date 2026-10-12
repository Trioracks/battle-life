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
 const vocalDamageAffected=new Set(['src/vocal-result-dsp.js']);
 do{size=vocalDamageAffected.size;for(const [file,imports]of graph)if(imports.some(dependency=>vocalDamageAffected.has(dependency.file)))vocalDamageAffected.add(file);}while(vocalDamageAffected.size!==size);
 const demoAffected=new Set(['apartment-app','beat-beginner-bank','beat-catalog','beat-production','beat-result-dsp','beat-work-view','underweb-view','virtual-pc-ui','vocal-catalog'].map(n=>'src/'+n+'.js'));
 do{size=demoAffected.size;for(const [file,imports]of graph)if(imports.some(dependency=>demoAffected.has(dependency.file)))demoAffected.add(file);}while(demoAffected.size!==size);
 for(const file of demoAffected)affected.add(file);
 const drySongAffected=new Set(['audio-performance','beat-song-form','beat-mix','beat-result-dsp','vocal-result-dsp','beat-audio','beat-playback','ft-studio-view'].map(n=>'src/'+n+'.js'));
 do{size=drySongAffected.size;for(const [file,imports]of graph)if(imports.some(dependency=>drySongAffected.has(dependency.file)))drySongAffected.add(file);}while(drySongAffected.size!==size);
 for(const file of drySongAffected)affected.add(file);
 const comfortAffected=new Set(['apartment-v3-camera','apartment-v3-scene','home-food','home-needs-view','vocal-result','vocal-result-dsp'].map(n=>'src/'+n+'.js'));
 do{size=comfortAffected.size;for(const [file,imports]of graph)if(imports.some(dependency=>comfortAffected.has(dependency.file)))comfortAffected.add(file);}while(comfortAffected.size!==size);
 for(const file of comfortAffected)affected.add(file);
 const genreForumAffected=new Set(['genre-progression','underweb-community-data','underweb-forum-archive','underweb-forum-archive-view','apartment-app','audio-performance','beat-playback','beat-production','beat-result','beat-result-dsp','beat-studio-view','beat-work-view','ft-studio-view','pc-software-catalog','pc-software-view','pc-software','underweb-community-view','underweb-community','underweb-view','virtual-pc-catalog','virtual-pc-explorer','virtual-pc-state','virtual-pc-ui','vocal-result-dsp'].map(n=>'src/'+n+'.js'));
 do{size=genreForumAffected.size;for(const [file,imports]of graph)if(imports.some(dependency=>genreForumAffected.has(dependency.file)))genreForumAffected.add(file);}while(genreForumAffected.size!==size);
 for(const file of genreForumAffected)affected.add(file);
 const patchAffected=new Set('src/apartment-app.js src/apartment-v3-animation.js src/apartment-v3-camera.js src/apartment-v3-computer.js src/apartment-v3-scene.js src/battle-submission-view.js src/battle-submission.js src/beat-production.js src/beat-studio-view.js src/beat-work-view.js src/creative-workflow.js src/footstep-cadence.js src/ft-studio-view.js src/home-creative-work.js src/home-needs-view.js src/indoor-footsteps.js src/lyric-production.js src/pc-identity.js src/pc-software-catalog.js src/pc-software-view.js src/pc-software.js src/pc-transfer-runtime.js src/rap-notebook-view.js src/underweb-view.js src/virtual-pc-catalog.js src/virtual-pc-disk-view.js src/virtual-pc-explorer-view.js src/virtual-pc-explorer.js src/virtual-pc-icons.js src/virtual-pc-menus.js src/virtual-pc-presentation.js src/virtual-pc-runtime.js src/virtual-pc-shell.js src/virtual-pc-state.js src/virtual-pc-system-windows.js src/virtual-pc-ui.js src/virtual-pc-window-state.js src/vocal-production.js src/vocal-result-dsp.js src/vocal-result.js'.split(' '));
 do{size=patchAffected.size;for(const [file,imports]of graph)if(imports.some(dependency=>patchAffected.has(dependency.file)))patchAffected.add(file);}while(patchAffected.size!==size);
 for(const file of patchAffected)affected.add(file);
 const html=await read('index.html');
 assert.match(html,/apartment-app\.js\?rev=35/);
 for(const style of ['apartment-v3','creator-v12','desktop-apps','rap-notebook'])assert.ok(html.includes(style+'.css?rev='+(style==='creator-v12'?28:35)),style+' must invalidate changed styles');
 assert.ok((await read('desktop-apps.css')).includes('underweb-world.css?rev=35'));
 assert.match(html,/virtual-pc\.css\?rev=35/,'Sloboda shell invalidates base styles');
 for(const [file,imports]of graph)for(const dependency of imports)if(affected.has(dependency.file))assert.equal(dependency.query,patchAffected.has(dependency.file)?'rev=35':genreForumAffected.has(dependency.file)?'rev=34':comfortAffected.has(dependency.file)?'rev=33':drySongAffected.has(dependency.file)?'rev=32':demoAffected.has(dependency.file)?'rev=31':vocalDamageAffected.has(dependency.file)?'rev=30':'rev=28',file+' must load canonical '+dependency.file);
 for(const file of changed)assert.ok(graph.has(file),file+' is covered by the live entry graph');
 // Work audio ownership stays at v28; the expanded sample catalog is invalidated.
 for(const [file,modules]of [
  ['src/apartment-app.js',['beat-work-audio']],
  ['src/beat-audio.js',['beat-beginner-bank']],
 ])for(const module of modules)assert.ok((await read(file)).includes(module+'.js?rev='+(patchAffected.has('src/'+module+'.js')?35:genreForumAffected.has('src/'+module+'.js')?34:demoAffected.has('src/'+module+'.js')?31:28)),file+' must invalidate '+module);
});

test('HTML loads the new versioned apartment entry; legacy campaign remains accessible',async()=>{
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/src="\.\/src\/apartment-app\.js\?rev=[^"]+"/);
  assert.match(html,/href="\.\/virtual-pc\.css\?rev=[^"]+"/);
  assert.match(html,/<section id="virtual-pc" hidden/);
  await access(new URL('../src/apartment-app.js?rev=30',import.meta.url));
  const legacy=await readFile(new URL('../legacy.html',import.meta.url),'utf8');
  assert.match(legacy,/id="creator-modal"/);
  assert.match(legacy,/src="\.\/src\/main\.js\?rev=[^"]+"/);
});

// Coordinate the additive release without invalidating unrelated resources.
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const root=new URL('../',import.meta.url);
// Tasks 1–8 relative to the preserved fcd2637 baseline; importer edits are derived.
export const changedModules='apartment-app avatar-v3-profile battle-npc-audio beat-abstract-bank beat-beginner-bank beat-catalog beat-execution-snapshot beat-experimental-leads-bank beat-playback beat-practice-curve beat-production beat-result-dsp beat-result beat-song-form beat-studio-view genre-progression home-profile-migration lyric-production npc-vocal-catalog pc-audio-exports source-levels test-skills-view test-skills track-version virtual-pc-state vocal-catalog vocal-production vocal-result voice-bank-migration'.split(' ').map(n=>'src/'+n+'.js');
export async function clientGraph({changed=changedModules}={}){
 const graph=new Map();
 async function visit(file){
  if(graph.has(file))return;
  const source=await readFile(new URL(file,root),'utf8');
  const imports=[...source.matchAll(/(?:from\s*|import\s*\(\s*|new URL\(\s*)['"](\.\.?\/[^'"]+\.js(?:\?[^'"]*)?)['"]/g)].map(m=>{
   const [relative,query='']=m[1].split('?');return {specifier:m[1],file:path.posix.normalize(path.posix.join(path.posix.dirname(file),relative)),query};
  });graph.set(file,{source,imports});for(const d of imports)if(d.file.startsWith('src/'))await visit(d.file);
 }
 await visit('src/apartment-app.js');
 const affected=new Set(changed);let size;
 do{size=affected.size;for(const [file,{imports}]of graph)if(imports.some(d=>affected.has(d.file)))affected.add(file);}while(size!==affected.size);
 return {graph,affected};
}
if(process.argv.includes('--apply')){
 const {graph,affected}=await clientGraph();
 for(const [file,{source,imports}]of graph){let output=source;for(const d of imports)if(affected.has(d.file))output=output.replaceAll(d.specifier,d.specifier.split('?')[0]+'?rev=49');if(output!==source)await writeFile(new URL(file,root),output);}
 const html=await readFile(new URL('index.html',root),'utf8');await writeFile(new URL('index.html',root),html.replace(/apartment-app\.js\?rev=\d+/,'apartment-app.js?rev=49').replace(/test-skills\.css\?rev=\d+/,'test-skills.css?rev=49'));
 console.log(JSON.stringify({changed:changedModules,affected:[...affected].sort()},null,2));
}

import {readFile,writeFile} from 'node:fs/promises';
import {clientGraph} from './abstract-client-revision.mjs';
export const changed='filya-catalog filya-calendar filya-profile-view musician-profile-view goblin-catalog goblin-mentor goblin-exchange goblin-dialog-view goblin-profile-view social-catalog social-state social-runtime social-background social-portraits social-profile-policy social-profile-view social-dialog-view social-audio-view social-view social-dom social-photo-view social-photo-feedback social-life-stories social-image player-life-photos avatar-life-scene avatar-portrait-renderer apartment-v3-scene apartment-interaction apartment-hover-outline battle-content-assets npc-social-profiles npc-social-profile-view round-announcement-view rap-notebook-view virtual-pc-explorer virtual-pc-explorer-view pc-software virtual-pc-ui battle-demo-config'.split(' ').map(n=>'src/'+n+'.js');
changed.push(...'social-messages-view social-dialog-layout pc-social-notifications social-worker-runtime battle-tournament battle-judging-clock battle-results-table battle-results-table-view'.split(' ').map(n=>'src/'+n+'.js'));
export const goblinClientGraph=()=>clientGraph({changed});
if(process.argv.includes('--goblin-apply')){
 const {graph,affected}=await goblinClientGraph(),root=new URL('../',import.meta.url);
 let count=0;
 for(const [file,{source,imports}]of graph){
  let output=source;for(const d of imports)if(affected.has(d.file))output=output.replaceAll(d.specifier,d.specifier.split('?')[0]+'?rev=57');
  if(output!==source){await writeFile(new URL(file,root),output);count++;}
 }
 const html=await readFile(new URL('index.html',root),'utf8');
 await writeFile(new URL('index.html',root),html.replace(/apartment-app\.js\?rev=\d+/,'apartment-app.js?rev=57').replace(/social-network\.css\?rev=\d+/,'social-network.css?rev=57'));
 console.log(`Social cache revision 57: ${count} importer files updated.`);
}

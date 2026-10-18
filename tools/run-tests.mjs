import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {localAssetPath,validateLocalAssetRoot} from '../test/helpers/local-assets.js';

const projectRoot=fileURLToPath(new URL('../',import.meta.url));
export function discoverTests({root=projectRoot,profile='public'}={}){
 if(!['public','local-assets'].includes(profile))throw new Error('Unknown test profile');
 const selected=[],excluded=[];
 function visit(relative){for(const entry of fs.readdirSync(path.join(root,relative),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const name=`${relative}/${entry.name}`;if(entry.isSymbolicLink())throw new Error(`Linked test input: ${name}`);if(entry.isDirectory())visit(name);else if(entry.isFile()&&/\.test\.(?:js|mjs)$/.test(entry.name)){
  if(profile==='public'&&name.startsWith('test/local-assets/'))excluded.push({path:name,reason:/\/(?:beat-skill-ladder|flow-genre-curve|gans-mix-preview)\.test\.js$/.test(name)?'requires native FFmpeg/Rubber Band DSP tooling; some cases also use explicitly configured private source assets':/\/(?:artem-local|apartment-installer)\.test\.js$/.test(name)?'requires Windows PowerShell archival/installer tooling':'requires explicitly configured private physical assets'});
  else if(profile==='local-assets'&&['test/local-assets/apartment-installer.test.js','test/local-assets/artem-local.test.js'].includes(name)&&process.platform!=='win32')excluded.push({path:name,reason:'Windows-only PowerShell installer or archival check; unavailable on this platform'});
  else selected.push(name);
 }}}
 visit('test');if(!selected.length)throw new Error('No selected tests: empty suite');return {selected,excluded};
}
export function validateRequiredAssets(root){
 const base=validateLocalAssetRoot(root),required=new Set(['assets/source/apartment-cutaway-v3.blend','assets/source/mannequin-v3.blend']);
 for(const bank of ['beginner-v1','beginner-v2','user-drums-v1','user-experimental-v1','vocals-v1','vocals-v2','npc-jura-v1','npc-artem-v1','npc-gans-v1','npc-kapa-v1','jura-experimental-v1','jura-experimental-v2','experimental-gans-v1']){
  const manifest=JSON.parse(fs.readFileSync(path.join(projectRoot,`assets/audio/ft/${bank}/manifest.json`),'utf8'));
  for(const part of manifest.parts)for(const value of [part.path,part.source])if(value)required.add(value);
 }
 for(const relative of required)try{if(!fs.statSync(localAssetPath(relative,base)).isFile())throw new Error('not a file');}catch{throw new Error(`Missing required local bank/source asset: ${relative}`);}
 return {root:base,requiredCount:required.size};
}
export function runTests(args=process.argv.slice(2)){
 let profile='public',assetRoot;
 for(let i=0;i<args.length;i++){if(args[i]==='--profile'&&args[i+1])profile=args[++i];else if(args[i]==='--asset-root'&&args[i+1])assetRoot=args[++i];else throw new Error(`Unknown or incomplete option: ${args[i]}`);}
 if(assetRoot&&profile!=='local-assets')throw new Error('--asset-root requires --profile local-assets');
 const suite=discoverTests({profile}),env={...process.env};
 // Scratch/cache locations belong to the caller or CI, without drive assumptions.
 delete env.BATTLE_LOCAL_ASSET_ROOT;
 if(profile==='local-assets'){const validated=validateRequiredAssets(assetRoot);env.BATTLE_LOCAL_ASSET_ROOT=validated.root;console.log(`Local prerequisites: ${validated.requiredCount} bank/source files validated`);}
 console.log(`Test profile ${profile}: selected ${suite.selected.length}, excluded ${suite.excluded.length}`);
 for(const entry of suite.excluded)console.log(`Excluded ${entry.path}: ${entry.reason}`);
 const result=spawnSync(process.execPath,['--test',...suite.selected],{cwd:projectRoot,env,stdio:'inherit',windowsHide:true});
 if(result.error)throw result.error;return result.status??1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)try{process.exitCode=runTests();}catch(error){console.error(error.message);process.exitCode=1;}

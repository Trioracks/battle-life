import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const sourceRoot=fileURLToPath(new URL('../',import.meta.url));
export const inside=(base,target)=>{const relative=path.relative(base,target);return !relative||relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative);};
export async function noLinks(target){
 let current=path.parse(target).root;
 for(const part of target.slice(current.length).split(path.sep).filter(Boolean)){
  current=path.join(current,part);try{if((await fs.lstat(current)).isSymbolicLink())throw Error('Linked QA path: '+current);}catch(error){if(error.code!=='ENOENT')throw error;}
 }
}
export async function validateQaOptions(options={}){
 const {live=false,url,prefix='/battle-life/'}=options;
 if(['userDataDir','storageState','context','browser'].some(key=>key in options))throw Error('QA requires a fresh isolated context; profile reuse is forbidden');
 if(!/^\/(?:[a-zA-Z0-9_-]+\/)+$/.test(prefix))throw Error('Invalid QA prefix');
 if(url&&!live)throw Error('A supplied URL requires --live');
 if(live){const parsed=new URL(url);if(parsed.port==='4173')throw Error('Player port 4173 is forbidden');if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.search||parsed.hash||parsed.pathname!==prefix)throw Error('Live QA requires an HTTPS URL with the exact prefix');}
 const root=path.resolve(options.root??path.join(sourceRoot,'dist/public-preview'));
 await noLinks(root);
 let manifest;
 try{
  if(await fs.stat(path.join(root,'package.json')).then(()=>true,()=>false))throw Error('source');
  await fs.access(path.join(root,'.nojekyll'));await fs.access(path.join(root,'index.html'));
  manifest=JSON.parse(await fs.readFile(path.join(root,'release.json'),'utf8'));
 }catch{throw Error('QA root must be a built artifact, never the source root');}
 const expectedRevision=options.expectedRevision??execFileSync('git',['rev-parse','HEAD'],{cwd:sourceRoot,encoding:'utf8',windowsHide:true}).trim();
 if(!/^[a-f0-9]{40}$/.test(expectedRevision)||manifest.revision!==expectedRevision)throw Error('Artifact revision differs from expected revision');
 if(manifest.version!=='0.1.0-preview.1'||manifest.profile!=='public-preview')throw Error('Unexpected preview release metadata');
 const outputDir=path.resolve(options.outputDir??(process.platform==='win32'?'D:/Codex/Builds/Battle/public-preview-qa':path.join(os.tmpdir(),'battle-public-preview-qa')));
 if(inside(root,outputDir)||inside(sourceRoot,outputDir)||inside(outputDir,root)||inside(outputDir,sourceRoot))throw Error('QA output must be outside source and built artifact');
 await noLinks(outputDir);
 return {root,outputDir,manifest,expectedRevision,prefix,live,url};
}

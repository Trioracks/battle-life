import { lstat, realpath, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { publicationPathReason, classifyPublicationFile } from './publication/policy.mjs';
import { git, resolveCommit, gitEntries, gitBlob } from './audit-publication.mjs';

const protectedPaths=new Set(['.gitignore','tools/publication/policy.mjs','tools/audit-publication.mjs','tools/export-public-source.mjs','test/publication-policy.test.js','docs/public-source-provenance.json']);
async function safeAncestors(destination,name) {
  let current=destination; for(const part of name.split('/').slice(0,-1)) { current=path.join(current,part); try { const info=await lstat(current); if(info.isSymbolicLink() || !info.isDirectory()) throw new Error('destination parent is a link or non-directory'); } catch(error) { if(error.code!=='ENOENT') throw error; } }
}
export async function exportPublicSource({sourceRepo,sourceRef,destination,dryRun}) {
  if(typeof dryRun!=='boolean') throw new Error('dryRun must be explicit');
  const source=await realpath(sourceRepo),dest=await realpath(destination); const relative=path.relative(source,dest),reverse=path.relative(dest,source);
  if(!relative || !relative.startsWith('..') || !reverse.startsWith('..')) throw new Error('destination must be separate from source and its parents');
  const destInfo=await lstat(destination); if(destInfo.isSymbolicLink()) throw new Error('destination cannot be a link');
  const metadata=await lstat(path.join(dest,'.git')); if(!metadata.isDirectory() || metadata.isSymbolicLink()) throw new Error('destination must be an independent clone');
  if(await realpath(git(dest,'rev-parse','--show-toplevel'))!==dest || git(dest,'remote','get-url','origin')!=='https://github.com/Trioracks/battle-life.git' || git(dest,'branch','--show-current')!=='codex/first-public-preview') throw new Error('destination is not the verified publication checkout');
  const sourceCommit=resolveCommit(source,sourceRef),base=resolveCommit(dest,'HEAD'); git(source,'merge-base','--is-ancestor',base,sourceCommit);
  await safeAncestors(dest,'docs/public-source-provenance.json');
  try { const info=await lstat(path.join(dest,'docs/public-source-provenance.json')); if(info.isSymbolicLink() || !info.isFile()) throw new Error('provenance destination must be a regular file'); } catch(error) { if(error.code!=='ENOENT') throw error; }
  const baseline=new Map(gitEntries(dest,base).map(e=>[e.path,e])); const files=[],conflicts=[]; let totalBytes=0;
  for(const entry of gitEntries(source,sourceCommit)) {
    if(protectedPaths.has(entry.path) || entry.type!=='blob' || !['100644','100755'].includes(entry.mode) || publicationPathReason(entry.path,'source')) continue;
    const data=await gitBlob(source,entry.oid); if(!classifyPublicationFile(entry.path,data.bytes,{target:'source'}).allowed) continue;
    await safeAncestors(dest,entry.path); let existing;
    try { const info=await lstat(path.join(dest,entry.path)); if(info.isSymbolicLink()||!info.isFile()) { conflicts.push({path:entry.path,reason:'destination is not a regular file'}); continue; } existing=await readFile(path.join(dest,entry.path)); } catch(error) { if(error.code!=='ENOENT') throw error; }
    if(existing && !existing.equals(data.bytes)) {
      const prior=baseline.get(entry.path); if(!prior || git(dest,'hash-object',`--path=${entry.path}`,'--',entry.path)!==prior.oid) { conflicts.push({path:entry.path,reason:'destination contains changes requiring review'}); continue; }
    }
    files.push({path:entry.path,size:data.size,sha256:data.sha256,blob:entry.oid}); totalBytes+=data.size;
  }
  if(!dryRun && !conflicts.length) {
    for(const file of files) { await safeAncestors(dest,file.path); const output=path.join(dest,file.path); await mkdir(path.dirname(output),{recursive:true}); const data=await gitBlob(source,file.blob); if(createHash('sha256').update(data.bytes).digest('hex')!==file.sha256) throw new Error('source hash changed'); await writeFile(output,data.bytes); }
    await safeAncestors(dest,'docs/public-source-provenance.json'); await mkdir(path.join(dest,'docs'),{recursive:true});
    await writeFile(path.join(dest,'docs/public-source-provenance.json'),JSON.stringify({sourceCommit,publicBase:base,files},null,2)+'\n');
  }
  return {sourceCommit,files,totalBytes,conflicts};
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  try { const args=process.argv.slice(2),option=name=>{const i=args.indexOf(name); if(i<0||!args[i+1]) throw new Error('missing option'); return args[i+1];};
    const result=await exportPublicSource({sourceRepo:option('--source-repo'),sourceRef:option('--source-ref'),destination:option('--destination'),dryRun:!args.includes('--apply')}); process.stdout.write(JSON.stringify(result,null,2)+'\n'); if(result.conflicts.length) process.exitCode=1;
  } catch { process.stderr.write('Public source export failed: unsafe destination, invalid source, or inaccessible file.\n'); process.exitCode=1; }
}

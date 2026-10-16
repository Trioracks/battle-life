import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { classifyPublicationFile, publicationPathReason, MAX_FILE_BYTES, MAX_SITE_BYTES } from './publication/policy.mjs';

export function git(repo,...args) { return execFileSync('git',['-C',repo,...args],{encoding:'utf8',maxBuffer:16*1024*1024,stdio:['ignore','pipe','pipe']}).trim(); }
export function resolveCommit(repo,ref) { return git(repo,'rev-parse','--verify','--end-of-options',`${ref}^{commit}`); }
export function gitEntries(repo,ref) { return git(repo,'ls-tree','-rz','--full-tree',ref).split('\0').filter(Boolean).map(line=>{ const tab=line.indexOf('\t'); const [mode,type,oid]=line.slice(0,tab).split(' '); return {mode,type,oid,path:line.slice(tab+1)}; }); }
async function collect(stream) {
  const chunks=[]; let size=0; const hash=createHash('sha256');
  for await(const chunk of stream) { size+=chunk.length; if(size>MAX_FILE_BYTES) { stream.destroy(); throw new Error('file exceeds 95 MiB budget'); } hash.update(chunk); chunks.push(chunk); }
  return {bytes:Buffer.concat(chunks,size),size,sha256:hash.digest('hex')};
}
export async function gitBlob(repo,oid) {
  const child=spawn('git',['-C',repo,'cat-file','blob',oid],{stdio:['ignore','pipe','pipe']}); child.stderr.resume();
  const completion=new Promise((resolve,reject)=>{ child.on('error',reject); child.on('close',code=>code===0?resolve():reject(new Error('unable to read Git blob'))); });
  try { const [data]=await Promise.all([collect(child.stdout),completion]); return data; } catch(error) { child.kill(); throw error; }
}
const operational=new Set(['.git','.superpowers','node_modules','dist','coverage','.worktrees']);
export async function auditTree({root,target}) {
  if(!['source','site'].includes(target)) throw new Error('unknown publication target');
  const files=[],violations=[]; let totalBytes=0;
  async function walk(relative='') {
    for(const entry of await readdir(path.join(root,relative),{withFileTypes:true})) {
      const name=relative?`${relative}/${entry.name}`:entry.name; const absolute=path.join(root,name); const info=await lstat(absolute);
      if(info.isSymbolicLink()) { violations.push({path:name,reason:'links are forbidden'}); continue; }
      if(target==='source' && !relative && operational.has(entry.name)) continue;
      if(info.isDirectory()) { await walk(name); continue; }
      if(!info.isFile()) { violations.push({path:name,reason:'non-regular file'}); continue; }
      totalBytes+=info.size; const reason=publicationPathReason(name,target); if(reason || info.size>MAX_FILE_BYTES) { violations.push({path:name,reason:reason||'file exceeds 95 MiB budget'}); continue; }
      const data=await collect(createReadStream(absolute)); const decision=classifyPublicationFile(name,data.bytes,{target});
      files.push({path:name,size:data.size,sha256:data.sha256}); if(!decision.allowed) violations.push({path:name,reason:decision.reason});
    }
  }
  const rootInfo=await lstat(root); if(!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) throw new Error('audit root must be a real directory');
  await walk(); if(target==='site' && totalBytes>MAX_SITE_BYTES) violations.push({path:'.',reason:'site exceeds 350 MiB budget'});
  return {ok:violations.length===0,files,totalBytes,violations};
}
export async function auditGitRange({repo,base,head}) {
  const end=resolveCommit(repo,head),start=base?resolveCommit(repo,base):null;
  if(start) git(repo,'merge-base','--is-ancestor',start,end);
  const commits=git(repo,'rev-list','--reverse',end,...(start?[`^${start}`]:[])).split('\n').filter(Boolean); const violations=[]; const checked=new Map();
  for(const commit of commits) for(const entry of gitEntries(repo,commit)) {
    if(entry.type!=='blob'||!['100644','100755'].includes(entry.mode)) { violations.push({commit,path:entry.path,reason:'links and submodules are forbidden'}); continue; }
    const key=`${entry.path}:${entry.oid}`; let reason=checked.get(key);
    if(reason===undefined) { reason=publicationPathReason(entry.path,'source'); if(!reason) { try { const decision=classifyPublicationFile(entry.path,(await gitBlob(repo,entry.oid)).bytes,{target:'source'}); reason=decision.allowed?'':decision.reason; } catch(error) { reason=error.message; } } checked.set(key,reason); }
    if(reason) violations.push({commit,path:entry.path,reason});
  }
  return {ok:violations.length===0,commits,violations};
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  try { const [mode,...args]=process.argv.slice(2); const option=name=>{const i=args.indexOf(name); if(i<0||!args[i+1]) throw new Error(`missing ${name}`); return args[i+1];};
    const result=mode==='history'?await auditGitRange({repo:process.cwd(),base:option('--base'),head:option('--head')}):await auditTree({root:path.resolve(option('--root')),target:mode});
    process.stdout.write(JSON.stringify(result,null,2)+'\n'); for(const v of result.violations) process.stderr.write(`${v.path}: ${v.reason}\n`); if(!result.ok) process.exitCode=1;
  } catch { process.stderr.write('Publication audit failed: invalid arguments, inaccessible tree, or invalid Git range.\n'); process.exitCode=1; }
}

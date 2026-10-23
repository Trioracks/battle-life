import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,renameSync,symlinkSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const script=resolve('tools/archive-gans-kapa-local.ps1');
const scratch=resolve('artifacts/gans-mix-session/intake-test-scratch');mkdirSync(scratch,{recursive:true});
const digest=b=>createHash('sha256').update(b).digest('hex');
function fixture(){
 const root=mkdtempSync(resolve(scratch,'batch-')),rows=[];
 for(const [voice,count] of [['Gans (skill 0-50)',49],['Kapa (skill 0-40)',50]])for(let i=1;i<=count;i++)rows.push({path:`Новая папка/beats 90 bpm/${voice}/take-${i}.wav`});
 for(const part of ['bass','drumm','lead'])for(let i=1;i<=3;i++)rows.push({path:`Новая папка/beats 90 bpm/${part} ${i}.mp3`});
 for(const [i,row]of rows.entries()){const b=Buffer.from('fixture original '+i);row.bytes=b.length;row.sha256=digest(b);row.incoming=true;mkdirSync(dirname(resolve(root,row.path)),{recursive:true});writeFileSync(resolve(root,row.path),b);}
 const excluded={path:'Новая папка/beats 90 bpm/skill 0 to 50 beatmaking.mp3'};writeFileSync(resolve(root,excluded.path),'excluded do not touch');
 const baseline=resolve(root,'baseline.json');writeFileSync(baseline,JSON.stringify({rows,excluded}));
 return {root,rows,excluded,baseline};
}
function run(f){return spawnSync('pwsh',['-NoProfile','-File',script,'-WorkspaceRoot',f.root,'-BaselinePath',f.baseline,'-Apply'],{encoding:'utf8',windowsHide:true});}
const archive=f=>JSON.parse(readFileSync(resolve(f.root,'stems/source-library/batches/gans-kapa-20261018-v1.json')));
// Catches a missing native move or a lost source; expectations do not use importer mapping logic.
test('archives all 108 exact bytes and leaves only the excluded source; retry moves zero',()=>{
 const f=fixture(),r=run(f);assert.equal(r.status,0,r.stderr);
 assert.equal(existsSync(resolve(f.root,f.rows[0].path)),false,'approved source must be moved');
 const m=archive(f);assert.equal(m.originals.length,108);
 for(const row of m.originals)assert.equal(digest(readFileSync(resolve(f.root,row.newPath))),row.sha256);
 assert.equal(readFileSync(resolve(f.root,f.excluded.path),'utf8'),'excluded do not touch');
 const retry=run(f);assert.equal(retry.status,0,retry.stderr);assert.equal(JSON.parse(retry.stdout).moved,0);
});
// Catches incremental validation that starts moving before a later collision is checked.
test('a final destination collision aborts before the first move',()=>{
 const f=fixture(),dest=resolve(f.root,'stems/source-library/instruments/gans-kapa-20261018-v1/lead/lead 3.mp3');mkdirSync(dirname(dest),{recursive:true});writeFileSync(dest,'existing unrelated');
 const r=run(f);assert.notEqual(r.status,0);assert.equal(readFileSync(dest,'utf8'),'existing unrelated');assert.ok(existsSync(resolve(f.root,f.rows[0].path)));
});
// Catches accepting a stale baseline or moving valid early files before checking all hashes.
test('changed final source aborts the entire batch',()=>{
 const f=fixture();writeFileSync(resolve(f.root,f.rows.at(-1).path),'changed');assert.notEqual(run(f).status,0);assert.ok(existsSync(resolve(f.root,f.rows[0].path)));
});
// Catches inability to resume a process interrupted between a native move and manifest creation.
test('resumes a partially moved batch without overwriting archived bytes',()=>{
 const f=fixture(),dest=resolve(f.root,'stems/source-library/voices/gans/gans-kapa-20261018-v1/take-1.wav');mkdirSync(dirname(dest),{recursive:true});renameSync(resolve(f.root,f.rows[0].path),dest);
 const r=run(f);assert.equal(r.status,0,r.stderr);assert.equal(JSON.parse(r.stdout).moved,107);assert.equal(archive(f).originals.length,108);
});
// Catches trusting traversal paths supplied by a malformed inventory.
test('rejects inventory traversal before any source moves',()=>{
 const f=fixture();f.rows.at(-1).path='Новая папка/beats 90 bpm/../lead 3.mp3';writeFileSync(f.baseline,JSON.stringify({rows:f.rows,excluded:f.excluded}));assert.notEqual(run(f).status,0);assert.ok(existsSync(resolve(f.root,f.rows[0].path)));
});
// Catches a library junction that redirects otherwise valid destinations outside its tree.
test('rejects destination junctions before any source moves',()=>{
 const f=fixture(),outside=mkdtempSync(resolve(scratch,'outside-'));mkdirSync(resolve(f.root,'stems'),{recursive:true});symlinkSync(outside,resolve(f.root,'stems/source-library'),'junction');
 assert.notEqual(run(f).status,0);assert.ok(existsSync(resolve(f.root,f.rows[0].path)));
});

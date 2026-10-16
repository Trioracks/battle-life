import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import vm from 'node:vm';
import test from 'node:test';

const filename=new URL('../.github/workflows/pages.yml',import.meta.url);
const workflow=()=>{assert.ok(fs.existsSync(filename),'Pages workflow must exist');return fs.readFileSync(filename,'utf8').replace(/\r\n/g,'\n');};
function job(name){const source=workflow();const match=source.match(new RegExp(`^  ${name}:\\n([\\s\\S]*?)(?=^  [a-z-]+:\\n|$(?![\\s\\S]))`,'m'));assert.ok(match,`missing ${name} job`);return match[1];}
function condition(){const match=job('deploy').match(/^    if: \$\{\{ (.+) \}\}$/m);assert.ok(match,'deploy requires explicit event/result guard');return match[1];}
function mayDeploy(event,ref,result){return vm.runInNewContext(condition(),{github:{event_name:event,ref},needs:{'checks-build':{result}}});}
function bashExecutable(){
 if(process.platform!=='win32')return 'bash';
 const found=spawnSync('where.exe',['git'],{encoding:'utf8'});
 assert.equal(found.status,0,'Git for Windows is required for the publication policy tests');
 for(const git of found.stdout.trim().split(/\r?\n/))for(const relative of ['../bin/bash.exe','../usr/bin/bash.exe','bash.exe']){
  const candidate=path.resolve(path.dirname(git),relative);if(fs.existsSync(candidate))return candidate;
 }
 assert.fail('Cannot find the Bash bundled with Git for Windows');
}
function publicationPolicy(){
 const match=job('deploy').match(/^    concurrency:\n((?:^      .+\n)+)/m);assert.ok(match,'missing publication concurrency');
 const entries=Object.fromEntries([...match[1].matchAll(/^      ([a-z-]+): (.+)$/gm)].map(([,key,value])=>[key,value]));
 return {group:entries.group,queue:entries.queue??'single',cancelInProgress:entries['cancel-in-progress']==='true'};
}
function runMasterGuard(remote,release,run=release){
 const match=job('deploy').match(/id: current-master\n        shell: bash\n        run: \|\n([\s\S]*?)(?=^      -)/m);assert.ok(match,'missing final current-master guard');
 const script=match[1].replace(/^          /gm,'');
 // Substitute the network boundary only; execute the actual workflow shell guard.
 const fake='git() { if [[ "$1" != ls-remote || "$2" != --exit-code || "$3" != https://github.com/Trioracks/battle-life.git || "$4" != refs/heads/master ]]; then return 99; fi; if [[ "$REMOTE" == failure ]]; then return 2; fi; if [[ -n "$REMOTE" ]]; then printf "%s\\trefs/heads/master\\n" "$REMOTE"; fi; }\n';
 return spawnSync(bashExecutable(),['--noprofile','--norc','-c',fake+script],{encoding:'utf8',env:{...process.env,REMOTE:remote,RELEASE_SHA:release,GITHUB_SHA:run,GITHUB_SERVER_URL:'https://github.com',GITHUB_REPOSITORY:'Trioracks/battle-life'}});
}
// Model the documented GitHub admission boundary using the actual policy above:
// cancel-in-progress may cancel the active job; default single replaces pending;
// max retains FIFO admission order up to 100 pending jobs. The real SHA guard
// determines which admitted revision can publish, independently of build order.
function admitPublication(state,incoming,policy){
 if(!state.active){state.active=incoming;return;}
 if(policy.cancelInProgress){state.cancelled.push(state.active);state.active=null;}
 if(policy.queue==='single')state.cancelled.push(...state.pending.splice(0));
 if(state.pending.length<(policy.queue==='max'?100:1))state.pending.push(incoming);
 else state.cancelled.push(incoming);
}
function finishPublications(state,currentMaster){
 const published=[],rejected=[];
 for(const revision of [state.active,...state.pending].filter(Boolean)){
  const result=runMasterGuard(currentMaster,revision);
  if(result.status===0)published.push(revision);
  else{assert.equal(result.status,1,result.stderr||result.error?.message);rejected.push(revision);}
 }
 return {published,rejected,cancelled:state.cancelled};
}

test('only successful master push/manual runs can deploy',()=>{
 for(const [event,ref,result,want]of [
  ['push','refs/heads/master','success',true],['workflow_dispatch','refs/heads/master','success',true],
  ['pull_request','refs/heads/master','success',false],['pull_request','refs/pull/5/merge','success',false],
  ['workflow_dispatch','refs/heads/topic','success',false],['push','refs/heads/topic','success',false],
  ['push','refs/heads/master','failure',false],['workflow_dispatch','refs/heads/master','cancelled',false],
  ['push','refs/heads/master','skipped',false]])assert.equal(mayDeploy(event,ref,result),want,`${event}/${ref}/${result}`);
 assert.match(job('deploy'),/^    needs: checks-build$/m);
 const events=workflow().split(/^permissions:/m)[0];assert.match(events,/^  pull_request:$/m);assert.match(events,/^  push:\n    branches: \[master\]$/m);assert.match(events,/^  workflow_dispatch:$/m);
});

test('PR checks have read-only tokens, exact head checkout, full history and no Pages dependency',()=>{
 assert.match(workflow(),/^permissions:\n  contents: read\n/m);
 const checks=job('checks-build');assert.doesNotMatch(checks,/pages: write|id-token: write|configure-pages|deploy-pages|secrets\./);
 assert.match(checks,/ref: \$\{\{ github.event.pull_request.head.sha \|\| github.sha \}\}/);
 assert.match(checks,/fetch-depth: 0/);assert.match(checks,/persist-credentials: false/);
 assert.match(checks,/node-version: '24'/);assert.match(checks,/python-version: '3.13'/);assert.match(checks,/BATTLE_PYTHON: python3/);
 for(const command of ['npm ci','npm test','npm run audit:source','node tools/audit-publication.mjs history','npm run build:preview','npm run audit:site','npm run qa:preview'])assert.ok(checks.includes(command),`missing ${command}`);
 assert.match(checks,/git merge-base/);assert.match(checks,/git rev-parse HEAD/);assert.match(checks,/AUDIT_HEAD/);
 assert.doesNotMatch(checks,/local-full|test:local-assets|asset-root|4173|D:\\/);
 assert.match(checks,/--root dist\/public-preview --output-dir "\$RUNNER_TEMP\/public-preview-qa"/);
});

test('job-level environments do not use the unavailable runner context',()=>{
 for(const name of ['checks-build','deploy']){
  const environments=[...job(name).matchAll(/^    env:\n((?:^      .+\n)+)/gm)];
  for(const [,environment]of environments)assert.doesNotMatch(environment,/\$\{\{\s*runner\s*\./,`${name} job env cannot access runner context`);
 }
});

test('runner temporary paths are exported before any action setup or downloads',()=>{
 const checks=job('checks-build');
 const initialization=checks.match(/^      - name: [^\n]+\n        id: runner-environment\n        shell: bash\n        run: \|\n((?:^          .*\n)+)/m);
 assert.ok(initialization,'missing runner environment initialization shell step');
 for(const boundary of ['uses: actions/','run: npm ci','run: npx playwright install']){
  assert.ok(checks.indexOf(boundary)>initialization.index,`initialize runner paths before ${boundary}`);
 }
 const script=initialization[1].replace(/^          /gm,'');
 const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'pages runner env-'));
 try{
  const output=path.join(scratch,'github env').replaceAll('\\','/');
  for(const runnerTemp of ['/hosted-runner/temp','/hosted runner/temp space']){
   fs.writeFileSync(output,'');
   const result=spawnSync(bashExecutable(),['--noprofile','--norc','-c',script],{encoding:'utf8',env:{...process.env,RUNNER_TEMP:runnerTemp,GITHUB_ENV:output}});
   assert.equal(result.status,0,result.stderr||result.error?.message);
   const exported=Object.fromEntries(fs.readFileSync(output,'utf8').trim().split(/\r?\n/).map(line=>{const separator=line.indexOf('=');return [line.slice(0,separator),line.slice(separator+1)];}));
   assert.deepEqual(exported,{
    TEMP:runnerTemp,TMP:runnerTemp,
    npm_config_cache:`${runnerTemp}/npm-cache`,PLAYWRIGHT_BROWSERS_PATH:`${runnerTemp}/playwright`
   });
  }
 }finally{fs.rmSync(scratch,{recursive:true,force:true});}
});

test('only the guarded deployment owns publication permissions, environment and concurrency',()=>{
 const source=workflow(),deploy=job('deploy');
 assert.equal((source.match(/pages: write/g)||[]).length,1);assert.equal((source.match(/id-token: write/g)||[]).length,1);
 assert.match(deploy,/permissions:\n      contents: read\n      pages: write\n      id-token: write/);
 assert.match(deploy,/environment:\n      name: github-pages\n      url: \$\{\{ steps.deployment.outputs.page_url \}\}/);
 assert.equal((source.match(/concurrency:/g)||[]).length,1);
 assert.deepEqual(publicationPolicy(),{group:'pages-publication',queue:'max',cancelInProgress:false});
 assert.match(deploy,/release_sha: \$\{\{ needs\['checks-build'\].outputs.release_sha \}\}/);
 assert.ok(deploy.indexOf('actions/configure-pages@')<deploy.indexOf('id: current-master'));
 assert.match(deploy,/id: current-master[\s\S]+?\n      - name: Deploy Pages\n        id: deployment\n        uses: actions\/deploy-pages@/);
});

test('the only uploaded artifact is the audited runtime tree and all official actions are pinned',()=>{
 const source=workflow();assert.equal((source.match(/upload-pages-artifact@/g)||[]).length,1);
 assert.match(job('checks-build'),/uses: actions\/upload-pages-artifact@[a-f0-9]{40} # v4\n        with:\n          path: dist\/public-preview\n/);
 assert.doesNotMatch(source,/actions\/upload-artifact@|pull_request_target/);
 const expected=new Map([
  ['checkout',['d23441a48e516b6c34aea4fa41551a30e30af803','6']],
  ['setup-node',['949feb2413d6458794dcd2491c4babbbce0c15c1','7']],
  ['setup-python',['5fda3b95a4ea91299a34e894583c3862153e4b97','7']],
  ['configure-pages',['983d7736d9b0ae728b81ab479565c72886d7745b','5']],
  ['upload-pages-artifact',['7b1f4a764d45c48632c6b24a0339c27f5614fb0b','4']],
  ['deploy-pages',['d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e','4']]
 ]);
 const actions=[...source.matchAll(/uses: actions\/([a-z-]+)@([^\s]+) # v(\d+)/g)];assert.equal(actions.length,6);
 for(const [,action,sha,version]of actions)assert.deepEqual([sha,version],expected.get(action));
});

test('late older build cannot cancel the newer active deployment',()=>{
 const older='a'.repeat(40),newer='b'.repeat(40),state={active:newer,pending:[],cancelled:[]};
 admitPublication(state,older,publicationPolicy());
 assert.deepEqual(state,{active:newer,pending:[older],cancelled:[]});
 assert.deepEqual(finishPublications(state,newer),{published:[newer],rejected:[older],cancelled:[]});
});

test('late older build cannot replace the newer pending deployment',()=>{
 const first='c'.repeat(40),older='a'.repeat(40),newer='b'.repeat(40),state={active:first,pending:[newer],cancelled:[]};
 admitPublication(state,older,publicationPolicy());
 assert.deepEqual(state,{active:first,pending:[newer,older],cancelled:[]});
 assert.deepEqual(finishPublications(state,newer),{published:[newer],rejected:[first,older],cancelled:[]});
});

test('the final publication guard rejects a slow old build, mismatched checkout and remote failure',()=>{
 for(const [remote,release,run,want]of [
  ['a'.repeat(40),'a'.repeat(40),'a'.repeat(40),0],
  ['b'.repeat(40),'a'.repeat(40),'a'.repeat(40),1],
  ['a'.repeat(40),'b'.repeat(40),'a'.repeat(40),1],
  ['','a'.repeat(40),'a'.repeat(40),1],
  ['failure','a'.repeat(40),'a'.repeat(40),2]]){
  const result=runMasterGuard(remote,release,run);
  assert.equal(result.status,want,result.stderr||result.error?.message);
 }
});

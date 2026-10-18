import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {discoverTests} from '../tools/run-tests.mjs';
import {localAssetPath,validateLocalAssetRoot} from './helpers/local-assets.js';
import {assetPath} from './helpers/apartment-assets.js';

test('public discovery retains all mixed logical files and excludes only explicit local asset tests',()=>{
 const suite=discoverTests({profile:'public'});
 for(const file of ['beat-beginner-bank','beat-bank-expansion','user-drums','user-experimental','vocal-assets'])assert.ok(suite.selected.includes(`test/${file}.test.js`),file);
 assert.ok(suite.selected.length>250);assert.ok(suite.excluded.length>=6);
 assert.ok(suite.excluded.every(entry=>entry.path.startsWith('test/local-assets/')&&entry.reason));
 const local=discoverTests({profile:'local-assets'}),platformExcluded=process.platform==='win32'?0:2;
 assert.equal(local.selected.length,suite.selected.length+suite.excluded.length-platformExcluded);
 assert.equal(local.excluded.length,platformExcluded);
 if(platformExcluded)assert.match(local.excluded[0].reason,/Windows-only/);
});
test('empty discovery and an explicit local run without banks fail closed',t=>{
 const dir=fs.mkdtempSync(path.join(tmpdir(),'test-discovery-'));t.after(()=>fs.rmSync(dir,{recursive:true}));fs.mkdirSync(path.join(dir,'test'));
 assert.throws(()=>discoverTests({root:dir,profile:'public'}),/empty|no .*tests/i);
 const run=spawnSync(process.execPath,['tools/run-tests.mjs','--profile','local-assets','--asset-root',dir],{encoding:'utf8'});
 assert.notEqual(run.status,0);assert.match(run.stderr,/missing.*bank|missing.*asset/i);
});

test('public discovery runs mjs preparation contracts and retains voice and curve logic',()=>{
 const suite=discoverTests({profile:'public'});
 for(const name of ['test/gans-kapa-preparation.test.mjs','test/voice-choice.test.js','test/flow-genre-curve.test.js','test/beat-skill-ladder.test.js'])assert.ok(suite.selected.includes(name),name);
});
test('local asset resolution requires an explicit real root and rejects escaping paths',t=>{
 const dir=fs.mkdtempSync(path.join(tmpdir(),'asset-root-'));t.after(()=>fs.rmSync(dir,{recursive:true}));fs.writeFileSync(path.join(dir,'sample.txt'),'fixture');
 const previous=process.env.BATTLE_LOCAL_ASSET_ROOT;t.after(()=>{if(previous===undefined)delete process.env.BATTLE_LOCAL_ASSET_ROOT;else process.env.BATTLE_LOCAL_ASSET_ROOT=previous;});
 delete process.env.BATTLE_LOCAL_ASSET_ROOT;assert.throws(()=>localAssetPath('sample.txt'),/explicit|BATTLE_LOCAL_ASSET_ROOT/);
 process.env.BATTLE_LOCAL_ASSET_ROOT=dir;assert.equal(localAssetPath('sample.txt'),path.join(dir,'sample.txt'));
 for(const relative of ['../escape','/absolute','C:/escape','a/../../escape','a\\..\\escape'])assert.throws(()=>localAssetPath(relative),/unsafe|relative|escape/i);
 assert.throws(()=>validateLocalAssetRoot(path.join(dir,'missing')),/root|ENOENT/);
 assert.throws(()=>assetPath('../escape.glb'),/escapes bundle root/);
});
test('Python executable override fails explicitly without silently skipping builder tests',()=>{
 const script="import {execPython} from './test/helpers/python.js'; execPython(['-B','-c','print(1)']);";
 const child=spawnSync(process.execPath,['--input-type=module','-e',script],{env:{...process.env,BATTLE_PYTHON:path.resolve('missing-python-executable')},encoding:'utf8'});
 assert.notEqual(child.status,0);assert.match(child.stderr,/Python 3 is required.*BATTLE_PYTHON/);
});
test('public runner preserves caller scratch paths and executes literal explicit test filenames',t=>{
 const root=fs.mkdtempSync(path.join(tmpdir(),'portable-runner-'));t.after(()=>fs.rmSync(root,{recursive:true}));
 for(const name of ['tools','test/helpers','chosen temp'])fs.mkdirSync(path.join(root,name),{recursive:true});
 fs.writeFileSync(path.join(root,'package.json'),JSON.stringify({type:'module'}));
 fs.copyFileSync(new URL('../tools/run-tests.mjs',import.meta.url),path.join(root,'tools/run-tests.mjs'));
 fs.copyFileSync(new URL('./helpers/local-assets.js',import.meta.url),path.join(root,'test/helpers/local-assets.js'));
 fs.writeFileSync(path.join(root,'test/literal suite check.test.js'),"import test from 'node:test';import assert from 'node:assert/strict';test('caller environment',()=>{assert.equal(process.env.TEMP,process.env.EXPECTED_TEMP);assert.equal(process.env.BATTLE_LOCAL_ASSET_ROOT,undefined);});");
 const temp=path.join(root,'chosen temp'),env={...process.env,TEMP:temp,TMP:temp,EXPECTED_TEMP:temp,BATTLE_LOCAL_ASSET_ROOT:'must not be inherited'};
 // Exercise a standalone CLI, outside this parent Node test worker context.
 delete env.NODE_TEST_CONTEXT;
 const result=spawnSync(process.execPath,[path.join(root,'tools/run-tests.mjs'),'--profile','public'],{env,encoding:'utf8'});
 assert.equal(result.status,0,result.stdout+result.stderr);assert.match(result.stdout,/selected 1, excluded 0/);assert.match(result.stdout,/caller environment/);
});

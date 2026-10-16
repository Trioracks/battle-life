import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const builder=()=>import('../tools/build-preview.mjs');
const sha='b773a928a5de456b5edf3e0521d8c5223cc352ad';
async function fixture(t){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'battle-build-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const put=async(name,text)=>{await fs.mkdir(path.dirname(path.join(root,name)),{recursive:true});await fs.writeFile(path.join(root,name),text);};
 await put('index.html','<script type="importmap">{"imports":{"three":"./vendor/three/three.module.js"}}</script><link rel="stylesheet" href="./apartment-v3.css?rev=44"><script type="module" src="./src/apartment-app.js?rev=44"></script>');
 await put('src/apartment-app.js',"import './build-info.js?rev=44'; import 'three'; new Worker(new URL('./social-worker.js?rev=44',import.meta.url)); fetch('./assets/apartment/v3/scene.json');");
 await put('src/social-worker.js','export const ready=true;');await put('src/build-info.js','export const BUILD_INFO={};');
 await put('vendor/three/three.module.js','export const REVISION=1;');await put('vendor/three/LICENSE','MIT fixture license');
 await put('apartment-v3.css',':root{color:olive}');await put('assets/apartment/v3/scene.json','{"geometry":"room.glb"}');
 // Minimal valid GLB without binary payload.
 const json=Buffer.from('{"asset":{"version":"2.0"}}'.padEnd(28,' '));const glb=Buffer.alloc(20+json.length);glb.write('glTF');glb.writeUInt32LE(2,4);glb.writeUInt32LE(glb.length,8);glb.writeUInt32LE(json.length,12);glb.writeUInt32LE(0x4e4f534a,16);json.copy(glb,20);await put('assets/apartment/v3/room.glb',glb);
 await put('assets/fonts/font/OFL.txt','Fixture font license');await put('docs/public-source-provenance.json',JSON.stringify({sourceCommit:sha}));
 execFileSync('git',['init','-q',root]);execFileSync('git',['-C',root,'add','.']);execFileSync('git',['-C',root,'-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','fixture']);
 const revision=execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
 return {root,put,options:{root,revision,sourceCommit:sha,builtAt:'2026-10-16T00:00:00.000Z'}};
}
test('builder exists as the public artifact API',async()=>{assert.equal(typeof (await builder()).buildPreview,'function');});
test('artifact uses real revision, excludes private files and reproduces fixed-time bytes',async t=>{
 const f=await fixture(t);for(const name of ['assets/audio/ft/a.wav','stems/raw.txt','tools/raw.js','test/raw.js','.local-audio.json','archive.zip','legacy.html','src/unreachable.js'])await f.put(name,'private');
 const {buildPreview}=await builder(),first=await buildPreview(f.options),second=await buildPreview(f.options);
 assert.deepEqual(first,second);assert.ok(first.totalBytes<=350*1024*1024);assert.ok(first.files.every(x=>x.size<=95*1024*1024&&/^[a-f0-9]{64}$/.test(x.sha256)));
 const out=path.join(f.root,'dist/public-preview'),release=JSON.parse(await fs.readFile(path.join(out,'release.json'),'utf8'));
 assert.deepEqual(release,{version:'0.1.0-preview.1',revision:f.options.revision,sourceCommit:sha,profile:'public-preview',builtAt:'2026-10-16T00:00:00.000Z'});
 const info=(await import(pathToFileURL(path.join(out,'src/build-info.js')))).BUILD_INFO;assert.deepEqual(info,release);
 assert.equal((await fs.readFile(path.join(out,'.nojekyll'))).length,0);assert.ok(first.files.some(x=>x.path==='vendor/three/LICENSE'));
 assert.ok(!first.files.some(x=>/legacy|private|raw|unreachable|test\/|tools\/|audio\/ft/.test(x.path)));
 assert.ok(!/legacy\.html/.test(await fs.readFile(path.join(out,'index.html'),'utf8')));
 assert.equal(await fs.readFile(path.join(f.root,'src/build-info.js'),'utf8'),'export const BUILD_INFO={};');
 await fs.access(path.join(f.root,'dist/public-preview-build-report.json'));
});
for(const [label,file] of [['module','src/social-worker.js'],['scene asset','assets/apartment/v3/room.glb']])test('missing '+label+' fails with path',async t=>{
 const f=await fixture(t);await fs.unlink(path.join(f.root,file));await assert.rejects(async()=> (await builder()).buildPreview(f.options),e=>e.message.includes(file));
});
test('missing imported module and wrong case fail closed',async t=>{
 const f=await fixture(t);await f.put('src/apartment-app.js',"import './Missing.js';");await f.put('src/missing.js','export const x=1;');await assert.rejects(async()=> (await builder()).buildPreview(f.options),/src\/Missing\.js/);
});
test('forbidden payload in an allowlisted runtime path fails',async t=>{
 const f=await fixture(t);await f.put('src/social-worker.js','ID3forbidden audio');await assert.rejects(async()=> (await builder()).buildPreview(f.options),/social-worker.*signature/);
});
test('documentation examples are not runtime imports or URLs',async t=>{
 const f=await fixture(t);await f.put('src/apartment-app.js',`/* import './absent.js'; new URL('https://example.invalid/absent.bin',import.meta.url) */\nexport const text='https://example.invalid/'; const color={from:'srgb-linear'};`);
 assert.ok((await (await builder()).buildPreview(f.options)).files.some(x=>x.path==='src/apartment-app.js'));
});
for(const [label,entry,missing] of [
 ['static module',"import './absent.js';",'src/absent.js'],
 ['literal Worker',"new Worker('./absent-worker.js');",'absent-worker.js'],
 ['import-map module',"import 'three';",'vendor/three/three.module.js'],
 ['catalog cover',null,'assets/battle-covers/absent.png'],
 ['CSS reference',null,'assets/fonts/absent.ttf'],
 ['runtime license',null,'vendor/three/LICENSE']
])test(label+' is required in the complete artifact',async t=>{
 const f=await fixture(t);if(entry)await f.put('src/apartment-app.js',entry);
 if(label==='import-map module'||label==='runtime license')await fs.unlink(path.join(f.root,missing));
 if(label==='catalog cover')await f.put('data/battles/covers-v1.json','{"covers":[{"path":"assets/battle-covers/absent.png"}]}');
 if(label==='CSS reference')await f.put('apartment-v3.css',"@font-face{src:url('./assets/fonts/absent.ttf')}");
 await assert.rejects(async()=> (await builder()).buildPreview(f.options),e=>e.message.includes(missing));
});
test('output escape, unowned output, local profile and false revision are refused',async t=>{
 const f=await fixture(t),{buildPreview}=await builder();
 for(const options of [{outDir:f.root},{outDir:path.join(f.root,'dist/elsewhere')},{profile:'local-full'},{revision:sha}])await assert.rejects(buildPreview({...f.options,...options}));
 await f.put('dist/public-preview/user-file.txt','keep');await assert.rejects(buildPreview(f.options),/owned/);assert.equal(await fs.readFile(path.join(f.root,'dist/public-preview/user-file.txt'),'utf8'),'keep');
});
test('file and aggregate budgets reject before reading oversized payloads',async t=>{
 const f=await fixture(t),{buildPreview}=await builder();await f.put('data/large.json','');let h=await fs.open(path.join(f.root,'data/large.json'),'r+');await h.truncate(95*1024*1024+1);await h.close();await assert.rejects(buildPreview(f.options),/95 MiB/);
 await fs.unlink(path.join(f.root,'data/large.json'));
 for(let i=0;i<4;i++){await f.put(`data/large${i}.json`,'');h=await fs.open(path.join(f.root,`data/large${i}.json`),'r+');await h.truncate(90*1024*1024);await h.close();}await assert.rejects(buildPreview(f.options),/350 MiB/);
});

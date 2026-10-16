import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { gzipSync, gunzipSync, deflateSync, crc32 } from 'node:zlib';
import { classifyPublicationFile } from '../tools/publication/policy.mjs';
import { auditTree, auditGitRange } from '../tools/audit-publication.mjs';
import { exportPublicSource } from '../tools/export-public-source.mjs';

const js = Buffer.from("const path='x.wav';");
const wave = Buffer.from('524946462400000057415645666d7420100000000100010044ac000088580100020010006461746100000000', 'hex');
const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000b49444154789c636000020000050001a5f645400000000049454e44ae426082','hex');
function pngMetadata(kind,payload) {
  const chunk=Buffer.alloc(payload.length+12); chunk.writeUInt32BE(payload.length); chunk.write(kind,4); payload.copy(chunk,8); chunk.writeUInt32BE(crc32(chunk.subarray(4,-4)),chunk.length-4);
  return Buffer.concat([png.subarray(0,33),chunk,png.subarray(33)]);
}
function binaryGlb(doc,bytes) {
  const text=Buffer.from(JSON.stringify(doc)),json=Buffer.alloc(Math.ceil(text.length/4)*4,32);text.copy(json);
  const bin=Buffer.alloc(Math.ceil(bytes.length/4)*4);bytes.copy(bin);const header=Buffer.alloc(20),binaryHeader=Buffer.alloc(8);
  header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+bin.length,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);
  binaryHeader.writeUInt32LE(bin.length);binaryHeader.writeUInt32LE(0x004e4942,4);return Buffer.concat([header,json,binaryHeader,bin]);
}
function git(repo, ...args) { return execFileSync('git', ['-C', repo, ...args], { encoding:'utf8', stdio:['ignore','pipe','pipe'] }).trim(); }
async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'publication-'));
  t.after(() => rm(root, {recursive:true, force:true})); return root;
}
async function repository(root) {
  await mkdir(root); git(root,'init','-b','master'); git(root,'config','user.name','Publication Test'); git(root,'config','user.email','test@example.invalid');
  await writeFile(path.join(root,'README.md'),'fixture'); git(root,'add','README.md'); git(root,'commit','-m','base'); return git(root,'rev-parse','HEAD');
}

test('policy rejects excluded paths, disguised media and invalid formats while retaining text catalogs', () => {
  for (const p of ['assets/source/scene.blend','../escape.js','/src/secret.js','C:/src/a.js','src/../escape.js','src\\escape.js','stems/catalog.json','src/secret.pem','.env','assets/ui/a.zip']) assert.equal(classifyPublicationFile(p,js,{target:'source'}).allowed,false,p);
  assert.equal(classifyPublicationFile('assets/ui/sound.png',wave,{target:'site'}).allowed,false);
  assert.equal(classifyPublicationFile('src/catalog.js',js,{target:'source'}).allowed,true);
  assert.equal(classifyPublicationFile('test/example.test.js',js,{target:'site'}).allowed,false);
  assert.equal(classifyPublicationFile('assets/ui/icon.png',png,{target:'site'}).allowed,true);
  assert.equal(classifyPublicationFile('assets/ui/icon.png',js,{target:'site'}).allowed,false);
  assert.equal(classifyPublicationFile('src/payload.js',Buffer.from('const audio="data:'+'audio/wav;base64,'+wave.toString('base64')+'"'),{target:'source'}).allowed,false);
  assert.equal(classifyPublicationFile('src/payload.json',Buffer.from(JSON.stringify({bytes:wave.toString('base64')})),{target:'source'}).allowed,false);
  assert.equal(classifyPublicationFile('src/payload.js',Buffer.concat([js,wave]),{target:'source'}).allowed,false);
  assert.equal(classifyPublicationFile('assets/ui/zip.png',Buffer.from('504b0304','hex'),{target:'site'}).allowed,false);
  assert.equal(classifyPublicationFile('assets/audio/pc/manifest.json',Buffer.from('{}'),{target:'site'}).allowed,true);
  assert.equal(classifyPublicationFile('assets/audio/ft/vocals-v1/manifest.json',Buffer.from('{}'),{target:'source'}).allowed,true);
  assert.equal(classifyPublicationFile('assets/audio/ft/vocals-v1/manifest.json',Buffer.from('{}'),{target:'site'}).allowed,false);
  assert.equal(classifyPublicationFile('.local-audio.example.json',Buffer.from('{"assetRoot":"example"}'),{target:'source'}).allowed,true);
  assert.equal(classifyPublicationFile('.local-audio.example.json',Buffer.from('{}'),{target:'site'}).allowed,false);
  assert.equal(classifyPublicationFile('.local-audio.json',Buffer.from('{}'),{target:'source'}).allowed,false);
});

test('policy retains ordinary separator comments without mistaking them for encoded MP3', () => {
  assert.equal(classifyPublicationFile('src/comment.js',Buffer.from('/'.repeat(80)+'\nexport const id=1;'),{target:'source'}).allowed,true);
  assert.equal(classifyPublicationFile('src/route.js',Buffer.from("const route='https://social/results/makarevich';"),{target:'source'}).allowed,true);
  const avif=Buffer.alloc(32); avif.writeUInt32BE(32); avif.write('ftypavif',4);
  assert.equal(classifyPublicationFile('vendor/image-loader.js',Buffer.from("const avif='data:image/avif;base64,"+avif.toString('base64')+"';"),{target:'source'}).allowed,true);
});

test('policy rejects encoded audio embedded in a structurally valid GLB', () => {
  const content=JSON.stringify({asset:{version:'2.0'},extras:{payload:wave.toString('base64')}}); const chunk=Buffer.from(content.padEnd(Math.ceil(content.length/4)*4,' '));
  const header=Buffer.alloc(20); header.write('glTF'); header.writeUInt32LE(2,4); header.writeUInt32LE(20+chunk.length,8); header.writeUInt32LE(chunk.length,12); header.writeUInt32LE(0x4e4f534a,16);
  assert.equal(classifyPublicationFile('assets/models/embedded.glb',Buffer.concat([header,chunk]),{target:'source'}).allowed,false);
});

test('policy rejects arbitrary bytes wrapped in JPEG boundary markers', () => {
  const wrapped=Buffer.concat([Buffer.from('ffd8','hex'),Buffer.from('not a JPEG image'),Buffer.from('ffd9','hex')]);
  assert.equal(classifyPublicationFile('assets/ui/fake.jpg',wrapped,{target:'source'}).allowed,false);
});

test('policy rejects raw media and complete archives inside CRC-correct PNG metadata', () => {
  for(const payload of [Buffer.from('fLaC'),gzipSync(wave)]) for(const target of ['source','site']) {
    assert.equal(classifyPublicationFile('assets/ui/payload.png',payload,{target}).allowed,false);
    for(const kind of ['tEXt','ruSt']) assert.equal(classifyPublicationFile('assets/ui/payload.png',pngMetadata(kind,Buffer.concat([Buffer.from('note\0'),payload])),{target}).allowed,false,kind);
  }
  assert.equal(classifyPublicationFile('assets/ui/plain.png',png,{target:'site'}).allowed,true);
  assert.equal(classifyPublicationFile('assets/ui/comment.png',pngMetadata('tEXt',Buffer.from('Software\0Battle test')),{target:'site'}).allowed,true);
});

test('PNG palette payloads cannot contain a complete gzip WAV archive', () => {
  const archive=gzipSync(wave),palette=Buffer.alloc(63);archive.copy(palette);
  assert.equal(archive.length,62);assert.deepEqual(gunzipSync(palette.subarray(0,62)),wave);
  for(const target of ['source','site']) {
    assert.equal(classifyPublicationFile('assets/ui/palette.png',pngMetadata('PLTE',palette),{target}).allowed,false);
    assert.equal(classifyPublicationFile('assets/ui/palette.png',pngMetadata('PLTE',Buffer.alloc(3)),{target}).allowed,true);
  }
});

test('binary provenance metadata retains isolated sync-like bytes but rejects complete audio frame chains', () => {
  const signature=Buffer.alloc(900); Buffer.from('fffb9000','hex').copy(signature,20);
  assert.equal(classifyPublicationFile('assets/ui/signed.png',pngMetadata('caBX',signature),{target:'source'}).allowed,true);
  const frames=Buffer.alloc(834); Buffer.from('fffb9000','hex').copy(frames); Buffer.from('fffb9000','hex').copy(frames,417);
  assert.equal(classifyPublicationFile('assets/ui/audio.png',pngMetadata('caBX',Buffer.concat([Buffer.alloc(20),frames])),{target:'source'}).allowed,false);
});

test('compressed PNG text cannot conceal encoded audio payloads', () => {
  const payload=Buffer.concat([Buffer.from('note\0\0'),deflateSync(Buffer.from(wave.toString('base64')))]);
  assert.equal(classifyPublicationFile('assets/ui/compressed.png',pngMetadata('zTXt',payload),{target:'source'}).allowed,false);
});

test('unshipped binary container formats require explicit review rather than header-only acceptance', () => {
  const webp=Buffer.alloc(20);webp.write('RIFF');webp.writeUInt32LE(12,4);webp.write('WEBP',8);
  for(const [ext,magic]of [['woff','wOFF'],['woff2','wOF2']]){const font=Buffer.alloc(48);font.write(magic);font.writeUInt32BE(48,8);assert.equal(classifyPublicationFile('assets/fonts/future.'+ext,font,{target:'source'}).allowed,false);}
  assert.equal(classifyPublicationFile('assets/ui/future.webp',webp,{target:'site'}).allowed,false);
});

test('GLB inspects image views, non-image views and unused BIN bytes', () => {
  const doc=bytes=>({asset:{version:'2.0'},buffers:[{byteLength:bytes.length}],bufferViews:[{buffer:0,byteLength:bytes.length}]});
  for(const bytes of [Buffer.from('fLaC'),gzipSync(wave)]) {
    assert.equal(classifyPublicationFile('assets/models/used.glb',binaryGlb(doc(bytes),bytes),{target:'source'}).allowed,false);
    const unused=doc(bytes);delete unused.bufferViews;
    assert.equal(classifyPublicationFile('assets/models/unused.glb',binaryGlb(unused,bytes),{target:'source'}).allowed,false);
  }
  const image=pngMetadata('tEXt',Buffer.from('note\0fLaC')),badImage=doc(image);badImage.images=[{bufferView:0,mimeType:'image/png'}];
  assert.equal(classifyPublicationFile('assets/models/image.glb',binaryGlb(badImage,image),{target:'site'}).allowed,false);
  const clean=doc(png);clean.images=[{bufferView:0,mimeType:'image/png'}];
  assert.equal(classifyPublicationFile('assets/models/clean.glb',binaryGlb(clean,png),{target:'site'}).allowed,true);
});

test('GLB validates numeric accessors without mistaking finite float sync bytes for audio', () => {
  const bytes=Buffer.alloc(72);Buffer.from('ffff1341','hex').copy(bytes);Buffer.from('ffff1341','hex').copy(bytes,36);
  const doc={asset:{version:'2.0'},buffers:[{byteLength:72}],bufferViews:[{buffer:0,byteLength:72}],accessors:[{bufferView:0,componentType:5126,count:6,type:'VEC3'}]};
  assert.equal(classifyPublicationFile('assets/models/coordinates.glb',binaryGlb(doc,bytes),{target:'source'}).allowed,true);
  doc.accessors[0].count=999;
  assert.equal(classifyPublicationFile('assets/models/overflow.glb',binaryGlb(doc,bytes),{target:'source'}).allowed,false);
});

for(const location of ['prefix','suffix','stride gaps']) test('GLB inspects audio in unreferenced numeric-view '+location,()=>{
  const stride=location==='stride gaps'?216:4,offset=location==='prefix'?836:0,count=location==='stride gaps'?2:1;
  const bytes=Buffer.alloc(location==='stride gaps'?220:840),frameLength=location==='stride gaps'?104:417,frames=Buffer.alloc(frameLength*2);
  const header=Buffer.from(location==='stride gaps'?'fffb1000':'fffb9000','hex');header.copy(frames);header.copy(frames,frameLength);frames.copy(bytes,location==='prefix'?0:4);
  const doc={asset:{version:'2.0'},buffers:[{byteLength:bytes.length}],bufferViews:[{buffer:0,byteLength:bytes.length,byteStride:stride}],accessors:[{bufferView:0,byteOffset:offset,componentType:5126,count,type:'SCALAR'}]};
  for(const target of ['source','site']) assert.equal(classifyPublicationFile('assets/models/unused.glb',binaryGlb(doc,bytes),{target}).allowed,false);
});

test('GLB merges numeric element coverage shared by interleaved accessors',()=>{
  const bytes=Buffer.alloc(72);Buffer.from('ffff1341','hex').copy(bytes);Buffer.from('ffff1341','hex').copy(bytes,36);
  const doc={asset:{version:'2.0'},buffers:[{byteLength:72}],bufferViews:[{buffer:0,byteLength:72,byteStride:8}],accessors:[0,4].map(byteOffset=>({bufferView:0,byteOffset,componentType:5126,count:9,type:'SCALAR'}))};
  assert.equal(classifyPublicationFile('assets/models/interleaved.glb',binaryGlb(doc,bytes),{target:'source'}).allowed,true);
});

test('GLB strided numeric coverage stays within a fixed heap budget including overlapping accessors', t => {
  // A per-element interval array exhausts this heap; the input itself is only 2 MiB.
  const script=`
    import { classifyPublicationFile } from './tools/publication/policy.mjs';
    const binaryGlb=${binaryGlb.toString()};
    const bytes=Buffer.alloc(2097152),cases=[];
    for(const copies of [1,4]) {
      const doc={asset:{version:'2.0'},buffers:[{byteLength:bytes.length}],bufferViews:[{buffer:0,byteLength:bytes.length,byteStride:4}],accessors:Array.from({length:copies},()=>({bufferView:0,componentType:5121,count:524288,type:'SCALAR'}))};
      const input=binaryGlb(doc,bytes),before=process.memoryUsage().heapUsed,start=performance.now();
      const decision=classifyPublicationFile('assets/models/strided.glb',input,{target:'source'});
      cases.push({copies,allowed:decision.allowed,inputBytes:input.length,elapsedMs:performance.now()-start,heapDelta:process.memoryUsage().heapUsed-before});
    }
    console.log(JSON.stringify(cases));
  `;
  const result=spawnSync(process.execPath,['--max-old-space-size=32','--input-type=module','-e',script],{cwd:new URL('../',import.meta.url),encoding:'utf8',windowsHide:true});
  assert.equal(result.status,0,'classification must complete under 32 MiB heap: '+result.stderr.slice(-1800));
  const cases=JSON.parse(result.stdout);
  assert.deepEqual(cases.map(({copies,allowed})=>({copies,allowed})),[{copies:1,allowed:true},{copies:4,allowed:true}]);
  t.diagnostic(JSON.stringify(cases)); // Measurements are diagnostic, never timing thresholds.
});

test('malformed GLB container records are rejected without throwing', () => {
  let decision;assert.doesNotThrow(()=>{decision=classifyPublicationFile('assets/models/malformed.glb',binaryGlb({asset:{version:'2.0'}},Buffer.alloc(4)),{target:'source'});});
  assert.equal(decision.allowed,false);
});

test('TTF rejects payload-bearing tables and tables overlapping its directory', () => {
  const font=Buffer.alloc(32);font.writeUInt32BE(0x00010000);font.writeUInt16BE(1,4);font.write('name',12);font.writeUInt32BE(28,20);font.writeUInt32BE(4,24);font.write('fLaC',28);
  assert.equal(classifyPublicationFile('assets/fonts/payload.ttf',font,{target:'source'}).allowed,false);
  font.fill(0,28);font.writeUInt32BE(16,20);
  assert.equal(classifyPublicationFile('assets/fonts/overlap.ttf',font,{target:'source'}).allowed,false);
});

test('policy excludes generated geometry and walk QA output from source and site', () => {
  for(const target of ['source','site']) for(const name of ['geometry-audit.json','walk-audit.json']) assert.equal(classifyPublicationFile('assets/apartment/v3/'+name,Buffer.from('{}'),{target}).allowed,false);
  for(const name of ['scene.json','rig.json']) assert.equal(classifyPublicationFile('assets/apartment/v3/'+name,Buffer.from('{}'),{target:'site'}).allowed,true);
});

test('asset JSON requires a reviewed runtime metadata path rather than an arbitrary report name', () => {
  for(const target of ['source','site']) {
    assert.equal(classifyPublicationFile('assets/ui/generated-report.json',Buffer.from('{}'),{target}).allowed,false);
    for(const name of ['assets/apartment/v3/scene.json','assets/apartment/v3/rig.json','assets/models/apartment-first-location.manifest.json','assets/models/avatar.manifest.json','assets/npc-photos/manifest.json','assets/social/photos/manifest.json']) assert.equal(classifyPublicationFile(name,Buffer.from('{}'),{target}).allowed,true,name);
  }
});

test('history audit rejects generated QA output even after a later commit removes it', async t => {
  const root=await fixture(t),repo=path.join(root,'repo'),base=await repository(repo);
  await mkdir(path.join(repo,'assets','apartment','v3'),{recursive:true}); await writeFile(path.join(repo,'assets','apartment','v3','geometry-audit.json'),'{}');
  git(repo,'add','assets/apartment/v3/geometry-audit.json'); git(repo,'commit','-m','QA output'); const bad=git(repo,'rev-parse','HEAD');
  git(repo,'rm','assets/apartment/v3/geometry-audit.json'); git(repo,'commit','-m','remove QA output');
  const result=await auditGitRange({repo,base,head:'HEAD'}); assert.equal(result.ok,false); assert.ok(result.violations.some(v=>v.commit===bad && v.path==='assets/apartment/v3/geometry-audit.json'));
});

test('exporter accepts unchanged CRLF checkout bytes as the public baseline', async t => {
  const root=await fixture(t),source=path.join(root,'source'); await repository(source);
  await writeFile(path.join(source,'README.md'),'baseline\n'); git(source,'add','README.md'); git(source,'commit','-m','LF base');
  const destination=path.join(root,'public'); git(root,'clone',source,destination); git(destination,'remote','set-url','origin','https://github.com/Trioracks/battle-life.git'); git(destination,'switch','-c','codex/first-public-preview'); git(destination,'config','core.autocrlf','true');
  await writeFile(path.join(destination,'README.md'),'baseline\r\n'); await writeFile(path.join(source,'README.md'),'updated\n'); git(source,'add','README.md'); git(source,'commit','-m','updated');
  assert.equal((await exportPublicSource({sourceRepo:source,sourceRef:'HEAD',destination,dryRun:true})).conflicts.length,0);
});

test('tree audit reports forbidden files and refuses links without following them', async t => {
  const root = await fixture(t); await mkdir(path.join(root,'src')); await writeFile(path.join(root,'src','safe.js'),js);
  await mkdir(path.join(root,'assets','ui'),{recursive:true}); await writeFile(path.join(root,'assets','ui','disguised.png'),wave);
  await symlink(path.join(root,'src'),path.join(root,'src','linked'),process.platform==='win32'?'junction':'dir');
  const result = await auditTree({root,target:'source'}); assert.equal(result.ok,false);
  assert.ok(result.violations.some(x=>x.path==='assets/ui/disguised.png')); assert.ok(result.violations.some(x=>x.path==='src/linked' && /link/i.test(x.reason)));
});

test('source working audit excludes only operational roots while site and history audit reject them', async t => {
  const root=await fixture(t); await mkdir(path.join(root,'.superpowers')); await writeFile(path.join(root,'.superpowers','local.md'),'local');
  await writeFile(path.join(root,'.gitignore'),'*.wav\n'); await writeFile(path.join(root,'ignored.wav'),wave);
  const source=await auditTree({root,target:'source'}); assert.equal(source.ok,false); assert.deepEqual(source.violations.map(v=>v.path),['ignored.wav']);
  const site=await auditTree({root,target:'site'}); assert.ok(site.violations.some(v=>v.path==='.superpowers/local.md'));
  const repo=path.join(root,'repo'); const base=await repository(repo); await mkdir(path.join(repo,'.superpowers')); await writeFile(path.join(repo,'.superpowers','local.md'),'local');
  git(repo,'add','.superpowers/local.md'); git(repo,'commit','-m','bad local state'); assert.equal((await auditGitRange({repo,base,head:'HEAD'})).ok,false);
});

test('exporter refuses a provenance symlink before writing any imported files', async t => {
  const root=await fixture(t),source=path.join(root,'source'); await repository(source);
  const destination=path.join(root,'public'); git(root,'clone',source,destination); git(destination,'remote','set-url','origin','https://github.com/Trioracks/battle-life.git'); git(destination,'switch','-c','codex/first-public-preview');
  await mkdir(path.join(source,'src')); await writeFile(path.join(source,'src','safe.js'),js); git(source,'add','src/safe.js'); git(source,'commit','-m','source');
  const outside=path.join(root,'outside'); await mkdir(outside); await mkdir(path.join(destination,'docs')); await symlink(outside,path.join(destination,'docs','public-source-provenance.json'),process.platform==='win32'?'junction':'dir');
  await assert.rejects(exportPublicSource({sourceRepo:source,sourceRef:'HEAD',destination,dryRun:false}),/provenance/);
  await assert.rejects(readFile(path.join(destination,'src','safe.js')),{code:'ENOENT'});
});

test('history audit catches an audio blob added then deleted and accepts safe commit trees', async t => {
  const root = await fixture(t); const repo=path.join(root,'repo'); const base=await repository(repo);
  await writeFile(path.join(repo,'index.html'),js); git(repo,'add','index.html'); git(repo,'commit','-m','safe'); const safe=git(repo,'rev-parse','HEAD');
  assert.equal((await auditGitRange({repo,base,head:safe})).ok,true);
  await mkdir(path.join(repo,'assets','ui'),{recursive:true}); await writeFile(path.join(repo,'assets','ui','sound.png'),wave);
  git(repo,'add','assets/ui/sound.png'); git(repo,'commit','-m','add disguised WAV'); const bad=git(repo,'rev-parse','HEAD');
  git(repo,'rm','assets/ui/sound.png'); git(repo,'commit','-m','delete WAV');
  const result=await auditGitRange({repo,base:safe,head:'HEAD'}); assert.equal(result.ok,false); assert.equal(result.commits.length,2);
  assert.ok(result.violations.some(x=>x.commit===bad && x.path==='assets/ui/sound.png'));
});

test('exporter previews tracked source only, preserves conflicts, hashes copied bytes and rejects unsafe destinations', async t => {
  const root=await fixture(t); const source=path.join(root,'source'); await repository(source);
  const destination=path.join(root,'public'); git(root,'clone',source,destination); git(destination,'remote','set-url','origin','https://github.com/Trioracks/battle-life.git'); git(destination,'switch','-c','codex/first-public-preview');
  await mkdir(path.join(source,'src')); await writeFile(path.join(source,'src','safe.js'),js); await writeFile(path.join(source,'untracked.md'),'private');
  await mkdir(path.join(source,'assets','ui'),{recursive:true}); await writeFile(path.join(source,'assets','ui','audio.png'),wave);
  await mkdir(path.join(source,'assets','apartment','v3'),{recursive:true});
  for(const name of ['geometry-audit.json','walk-audit.json']) await writeFile(path.join(source,'assets','apartment','v3',name),'{}');
  git(source,'add','src/safe.js','assets/ui/audio.png','assets/apartment/v3'); git(source,'commit','-m','source'); const sourceRef=git(source,'rev-parse','HEAD'); const args={sourceRepo:source,sourceRef,destination};
  const preview=await exportPublicSource({...args,dryRun:true}); assert.equal(preview.files.length,2); assert.equal(preview.conflicts.length,0); assert.equal(preview.sourceCommit,sourceRef);
  await assert.rejects(readFile(path.join(destination,'src','safe.js')), {code:'ENOENT'});
  await mkdir(path.join(destination,'src')); await writeFile(path.join(destination,'src','safe.js'),'user changes'); assert.equal((await exportPublicSource({...args,dryRun:false})).conflicts.length,1);
  assert.equal(await readFile(path.join(destination,'src','safe.js'),'utf8'),'user changes'); await rm(path.join(destination,'src','safe.js'));
  const imported=await exportPublicSource({...args,dryRun:false}); assert.equal(imported.conflicts.length,0); assert.equal(await readFile(path.join(destination,'src','safe.js'),'utf8'),js.toString());
  const provenance=JSON.parse(await readFile(path.join(destination,'docs','public-source-provenance.json'),'utf8')); assert.equal(provenance.sourceCommit,sourceRef); assert.match(provenance.files.find(x=>x.path==='src/safe.js').sha256,/^[a-f0-9]{64}$/);
  await assert.rejects(exportPublicSource({...args,destination:source,dryRun:true})); await assert.rejects(exportPublicSource({...args,destination:root,dryRun:false}));
});

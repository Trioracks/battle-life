import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import http from 'node:http';
import {startPreviewServer} from '../tools/serve-preview.mjs';

async function fixture(t){
 const parent=await fs.mkdtemp(path.join(tmpdir(),'preview-server-'));t.after(()=>fs.rm(parent,{recursive:true,force:true}));
 const root=path.join(parent,'site'),assets=path.join(parent,'local');await fs.mkdir(root);await fs.mkdir(assets);
 const put=async(base,name,bytes)=>{await fs.mkdir(path.dirname(path.join(base,name)),{recursive:true});await fs.writeFile(path.join(base,name),bytes);};
 await put(root,'index.html','<title>fixture</title>');await put(root,'src/example.js','export const ok=true;');await put(root,'src/build-info.js',"export const BUILD_INFO=Object.freeze({profile:'public-preview'});");
 await put(root,'assets/models/sample.glb','tiny GLB response');await put(root,'assets/fonts/sample.woff','tiny font response');await put(root,'version.json','{}');
 await put(root,'.local-audio.json',JSON.stringify({assetRoot:assets}));await put(assets,'assets/audio/ft/beginner-v1/drums/01.wav',Buffer.from([82,73,70,70,1,2,3,4]));
 await put(assets,'stems/private.wav','private source');await put(assets,'assets/source/private.blend','private Blender source');
 return {root,assets,put};
}
function request(origin,url){return new Promise((resolve,reject)=>{http.get(origin+url,res=>{const chunks=[];res.on('data',b=>chunks.push(b));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,bytes:Buffer.concat(chunks)}));}).on('error',reject);});}
test('public preview serves only prefixed safe runtime files with correct MIME types',async t=>{
 const {root,assets}=await fixture(t),server=await startPreviewServer({root,port:0,prefix:'/battle-life/'});t.after(server.close);
 assert.match(server.origin,/^http:\/\/127\.0\.0\.1:\d+$/);assert.equal(server.url,server.origin+'/battle-life/');
 assert.equal((await request(server.origin,'/battle-life/?qa=true')).bytes.toString(),'<title>fixture</title>');
 for(const [name,mime] of [['src/example.js','text/javascript'],['assets/models/sample.glb','model/gltf-binary'],['assets/fonts/sample.woff','font/woff'],['version.json','application/json']]){const r=await request(server.origin,'/battle-life/'+name+'?rev=1');assert.equal(r.status,200);assert.match(r.headers['content-type'],new RegExp('^'+mime));}
 for(const url of ['/','/index.html','/battle-life/src/','/battle-life/../index.html','/battle-life/%2e%2e/index.html','/battle-life/%252e%252e/index.html','/battle-life/%2f../index.html','/battle-life/%ZZ','/battle-life/.local-audio.json','/battle-life/assets/audio/ft/beginner-v1/drums/01.wav','/battle-life/stems/private.wav'])assert.notEqual((await request(server.origin,url)).status,200,url);
 assert.match((await request(server.origin,'/battle-life/src/build-info.js')).bytes.toString(),/public-preview/);
 // The valid local settings above must never enable the public overlay.
 const explicit=await startPreviewServer({root,port:0,profile:'public-preview',assetRoot:assets});t.after(explicit.close);
 assert.notEqual((await request(explicit.origin,'/battle-life/assets/audio/ft/beginner-v1/drums/01.wav')).status,200);
});
test('local profile serves allowlisted bank bytes and virtual build info without changing tracked defaults',async t=>{
 const {root,assets}=await fixture(t),before=await fs.readFile(path.join(root,'src/build-info.js'));
 const server=await startPreviewServer({root,port:0,profile:'local-full'});t.after(server.close);
 const route='assets/audio/ft/beginner-v1/drums/01.wav',response=await request(server.origin,'/battle-life/'+route);
 assert.equal(response.status,200);assert.deepEqual(response.bytes,await fs.readFile(path.join(assets,route)));assert.match(response.headers['content-type'],/^audio\/wav/);
 assert.match((await request(server.origin,'/battle-life/src/build-info.js?rev=1')).bytes.toString(),/local-full/);
 assert.deepEqual(await fs.readFile(path.join(root,'src/build-info.js')),before);
 for(const name of ['.local-audio.json','stems/private.wav','assets/source/private.blend'])assert.notEqual((await request(server.origin,'/battle-life/'+name)).status,200,name);
});
test('public mode never inspects broken local settings or a supplied inaccessible local root',async t=>{
 const {root}=await fixture(t);await fs.writeFile(path.join(root,'.local-audio.json'),'invalid local settings');
 const server=await startPreviewServer({root,port:0,profile:'public-preview',assetRoot:path.join(root,'nonexistent-private-pack')});t.after(server.close);
 assert.equal((await request(server.origin,'/battle-life/')).status,200);
 await assert.rejects(startPreviewServer({root,port:0,profile:'local-full'}),SyntaxError);
});
test('server rejects symlink files, directories and root ancestors',async t=>{
 const {root,assets,put}=await fixture(t);await put(root,'src/secret.js','secret');
 await fs.symlink(path.join(root,'src'),path.join(root,'src/linked'),'junction');
 const drums=path.join(assets,'assets/audio/ft/beginner-v1/drums');await fs.rename(drums,drums+'-preserved');
 await fs.symlink(drums+'-preserved',drums,'junction');
 const server=await startPreviewServer({root,port:0,profile:'local-full',assetRoot:assets});t.after(server.close);
 assert.notEqual((await request(server.origin,'/battle-life/src/linked/secret.js')).status,200);
 assert.notEqual((await request(server.origin,'/battle-life/assets/audio/ft/beginner-v1/drums/01.wav')).status,200);
 await assert.rejects(startPreviewServer({root:path.join(root,'src/linked'),port:0}),/link/i);
});

import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

export function validateApartmentBundle(root){
 const base=path.resolve(root),errors=[],files=new Set(),glbs=new Map();
 function read(name){
  if(typeof name!=='string'||!name||name!==path.basename(name)||/[\\/:]/.test(name)||name==='.'||name==='..'){errors.push('unsafe bundle reference: '+name);return;}
  files.add(name);const file=path.join(base,name);
  try{if(fs.realpathSync(file)!==file)throw Error('symlink references are not allowed');return fs.readFileSync(file);}
  catch(e){errors.push(name+': '+e.message);}
 }
 function json(name){const b=read(name);if(!b)return;try{return JSON.parse(b);}catch{errors.push(name+': invalid JSON');}}
 function glb(name){
  if(glbs.has(name))return glbs.get(name);
  const b=read(name);if(!b)return;
  try{
   if(b.length<28||b.toString('ascii',0,4)!=='glTF'||b.readUInt32LE(4)!==2||b.readUInt32LE(8)!==b.length)throw Error('invalid GLB header/length');
   let at=12,g;
   while(at<b.length){const size=b.readUInt32LE(at),type=b.readUInt32LE(at+4);if(at+8+size>b.length||size%4)throw Error('truncated chunk');if(type===0x4e4f534a)g=JSON.parse(b.subarray(at+8,at+8+size).toString());at+=8+size;}
   if(!g?.nodes?.length||!g.meshes?.length)throw Error('missing geometry');
   if(g.buffers?.some(x=>x.uri)||g.images?.some(x=>x.uri))throw Error('external dependencies are not permitted');
   glbs.set(name,g);return g;
  }catch(e){errors.push(name+': '+e.message);}
 }
 const c=json('scene.json');if(!c)return {ok:false,errors,files:[...files]};
 if(c.version!==3)errors.push('scene.json: unsupported version');
 if(JSON.stringify(Object.keys(c.cameraViews??{}))!==JSON.stringify(['2D']))errors.push('scene.json: expected only 2D baked camera');
 const backgrounds=new Set([c.background,c.backgroundDay,...Object.values(c.camera?.lightingStates??{}).flatMap(Object.values)]);
 if(backgrounds.size!==8)errors.push('scene.json: expected eight lighting backgrounds');
 for(const file of backgrounds){const b=read(file);if(!b)continue;if(b.length<24||b.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||b.readUInt32BE(16)!==c.backgroundResolution?.[0]||b.readUInt32BE(20)!==c.backgroundResolution?.[1])errors.push(file+': invalid PNG dimensions');}
 const interaction=glb(c.geometry);glb(c.staticGeometry);const rig=glb(c.rig);glb(c.exterior?.geometry);glb(c.exterior?.occluders);
 const names=new Set(interaction?.nodes.map(n=>n.name));
 for(const name of c.liveRoots??[])if(!names.has(name))errors.push('missing live root: '+name);
 const clips=new Set(rig?.animations?.map(a=>a.name));
 for(const name of ['idle','walk','eat','sleep','seated'])if(!clips.has(name))errors.push('missing animation: '+name);
 for(const [id,a] of Object.entries(c.actions??{})){
  if(a.clip&&!clips.has(a.clip))errors.push('unknown action clip: '+id+'/'+a.clip);
  if(a.approach&&(!a.approach.every(Number.isFinite)||a.approach[0]<c.bounds[0]||a.approach[0]>c.bounds[1]))errors.push('out-of-bounds action: '+id);
 }
 if(!c.actions?.dining||c.actions.dining.clip!=='eat'||!c.actions.dining.fade)errors.push('missing dining action');
 const audit=json('geometry-audit.json');if(!audit||!Array.isArray(audit.errors)||audit.errors.length)errors.push('geometry audit has errors');
 json('rig.json');json('walk-audit.json');
 return {ok:errors.length===0,errors,files:[...files].sort()};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const result=validateApartmentBundle(process.argv[2]??'assets/apartment/v3');console.log(JSON.stringify(result,null,2));process.exitCode=result.ok?0:1;
}

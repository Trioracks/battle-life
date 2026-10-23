// Local-only export sink for tools/render-life-photos.html; never touches saves.
import http from 'node:http';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {normalizeNpcSocialProfiles} from '../src/npc-social-profiles.js';
import {npcLifeStory} from '../src/social-life-stories.js';
import {portraitKey} from '../src/social-portraits.js';
const directory=new URL('../assets/npc-photos/life/',import.meta.url);
const expected=new Map(Object.values(normalizeNpcSocialProfiles().byId).flatMap(profile=>(npcLifeStory(profile)?.photos??[]).map(photo=>[photo.src.split('/').at(-1),{id:photo.id,characterId:profile.characterId,appearanceId:portraitKey(profile.appearance),path:photo.src.slice(2)}])));
http.createServer(async(req,res)=>{
 const origin=req.headers.origin;
 if(!['http://127.0.0.1:4173','http://localhost:4173'].includes(origin)){res.writeHead(403).end();return;}
 res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Access-Control-Allow-Headers','Content-Type');
 if(req.method==='OPTIONS'){res.writeHead(204).end();return;}
 if(req.method!=='POST'||req.url!=='/export'){res.writeHead(404).end();return;}
 try{
  const chunks=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>12*1024*1024)throw Error('Export too large');chunks.push(chunk);}
  const rows=JSON.parse(Buffer.concat(chunks).toString());
  if(!Array.isArray(rows)||rows.length!==expected.size||new Set(rows.map(x=>x.name)).size!==expected.size)throw Error('Incomplete export');
  const decoded=rows.map(row=>{if(!expected.has(row.name)||!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(row.data))throw Error('Invalid image');const bytes=Buffer.from(row.data.split(',')[1],'base64');if(bytes[0]!==255||bytes[1]!==216)throw Error('Not JPEG');return {...row,bytes};});
  await mkdir(directory,{recursive:true});const photos=[];
  for(const row of decoded){await writeFile(new URL(row.name,directory),row.bytes);photos.push({...expected.get(row.name),sha256:createHash('sha256').update(row.bytes).digest('hex')});}
  await writeFile(new URL('manifest.json',directory),JSON.stringify({version:1,photos},null,2)+'\n');
  res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify({saved:photos.length}));
 }catch(error){res.writeHead(400,{'Content-Type':'application/json'}).end(JSON.stringify({error:error.message}));}
}).listen(4174,'127.0.0.1',()=>console.log('Life photo export: http://127.0.0.1:4174/export'));

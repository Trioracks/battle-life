import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {BEGINNER_BANK} from '../src/beat-beginner-bank.js';
import {renderBeginnerPart} from './audio/beginner-patterns.mjs';

const root=new URL('../assets/audio/ft/beginner-v1/',import.meta.url);
const previous=await readFile(new URL('manifest.json',root),'utf8').then(JSON.parse).catch(()=>({parts:[]}));
const parts=previous.parts.filter(p=>p.id.endsWith('-16'));
for(const part of BEGINNER_BANK){
  if(part.id.endsWith('-16'))continue; // User-derived extension is built by prepare-vocal-assets.mjs.
  const number=part.id.slice(-2),pcm=renderBeginnerPart(part.kind,Number(number)-1);
  const wav=Buffer.alloc(44+pcm.length*2);
  wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVE',8);
  wav.write('fmt ',12);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);
  wav.writeUInt32LE(44100,24);wav.writeUInt32LE(88200,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);
  wav.write('data',36);wav.writeUInt32LE(pcm.length*2,40);
  for(let i=0;i<pcm.length;i++)wav.writeInt16LE(Math.round(pcm[i]*32767),44+i*2);
  const directory=new URL(part.kind+'/',root);
  await mkdir(directory,{recursive:true});await writeFile(new URL(number+'.wav',directory),wav);
  parts.push({...part,frames:pcm.length,sampleRate:44100,sha256:createHash('sha256').update(wav).digest('hex')});
}
await writeFile(new URL('manifest.json',root),JSON.stringify({
  version:1,authorship:'Original procedural compositions and synthesis for Battle. No sampled third-party recordings.',
  bpm:90,bars:4,key:'A minor',parts
},null,2)+'\n');
console.log('Generated '+parts.length+' deterministic WAVs at '+fileURLToPath(root));

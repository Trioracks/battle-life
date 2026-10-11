// Derived game assets only. Source recordings are never rewritten.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {VOCALS} from '../src/vocal-catalog.js';
import {renderBeginnerPart} from './audio/beginner-patterns.mjs';
const ffmpeg=process.env.FFMPEG_PATH;if(!ffmpeg)throw Error('Set FFMPEG_PATH to an existing ffmpeg executable');
const root=new URL('../',import.meta.url),hash=b=>createHash('sha256').update(b).digest('hex');
function wav(pcm,channels){
 const w=Buffer.alloc(44+pcm.length);w.write('RIFF');w.writeUInt32LE(w.length-8,4);w.write('WAVEfmt ',8);w.writeUInt32LE(16,16);w.writeUInt16LE(1,20);w.writeUInt16LE(channels,22);w.writeUInt32LE(44100,24);w.writeUInt32LE(44100*channels*2,28);w.writeUInt16LE(channels*2,32);w.writeUInt16LE(16,34);w.write('data',36);w.writeUInt32LE(pcm.length,40);pcm.copy(w,44);return w;
}
async function convert(source,path){
 const before=await readFile(new URL(source,root));
 const r=spawnSync(ffmpeg,['-v','error','-i',fileURLToPath(new URL(source,root)),'-af','atrim=start_sample=0:end_sample=512000,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.003,afade=t=out:st=10.6166666667:d=0.05','-ar','44100','-ac','2','-f','s16le','pipe:1'],{maxBuffer:5000000,windowsHide:true});
 if(r.status!==0)throw Error(String(r.stderr));if(r.stdout.length!==470400*4)throw Error('Wrong loop length');
 const data=wav(r.stdout,2);await mkdir(new URL('.',new URL(path,root)),{recursive:true});await writeFile(new URL(path,root),data);
 if(hash(await readFile(new URL(source,root)))!==hash(before))throw Error('Source modified');
 return {source,sourceHash:hash(before),sha256:hash(data),frames:470400,sampleRate:44100};
}
const parts=[];
for(let i=0;i<40;i++){
 const a=VOCALS[i],source='stems/janres/non/vocal/untitled - '+(i===0?'REC.wav':'REC_'+(i+1)+'.wav');
 parts.push({...a,...await convert(source,a.path)});
}
await writeFile(new URL('assets/audio/ft/vocals-v1/manifest.json',root),JSON.stringify({version:1,authorship:'User-recorded vocals. Original WAV files preserved.',bpm:90,bars:4,parts},null,2)+'\n');
const bankUrl=new URL('assets/audio/ft/beginner-v1/manifest.json',root),bank=JSON.parse(await readFile(bankUrl));
for(const kind of ['drums','theme','arrangement']){
 const path='assets/audio/ft/beginner-v1/'+kind+'/16.wav',id='beginner-'+kind+'-16';let meta;
 if(kind==='theme')meta=await convert('stems/untitled - Track 1.wav',path);
 else{
  const samples=renderBeginnerPart(kind,15),pcm=Buffer.alloc(samples.length*2);samples.forEach((v,i)=>pcm.writeInt16LE(Math.round(v*32767),i*2));
  const data=wav(pcm,1);await writeFile(new URL(path,root),data);meta={frames:samples.length,sampleRate:44100,sha256:hash(data)};
 }
 bank.parts=bank.parts.filter(p=>p.id!==id);bank.parts.push({id,kind,bpm:90,bars:4,key:'A minor',path:'./'+path,...meta});
}
bank.authorship='Parts 01–15 and drums/bass 16: original procedural synthesis. Theme 16: user-recorded instrumental; source retained.';
await writeFile(bankUrl,JSON.stringify(bank,null,2)+'\n');console.log('Prepared 40 vocal loops and 3 additional bank parts; sources unchanged.');

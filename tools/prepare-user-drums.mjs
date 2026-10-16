import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {repeatDrumCycle,encodePcm16,pcmStatistics} from './audio/source-loop.mjs';
const sourceRoot='stems/janres/non/drums/90bpm/user-2026-10-12',output='assets/audio/ft/user-drums-v1';
const intake=JSON.parse(await readFile(sourceRoot+'/manifest.json'));
const hash=b=>createHash('sha256').update(b).digest('hex'),parts=[];
await mkdir(output,{recursive:true});
for(const [i,part] of intake.parts.entries()){
 const source=sourceRoot+'/'+part.file,sourceBytes=await readFile(source);
 if(hash(sourceBytes)!==part.sha256)throw Error('Source checksum changed: '+source);
 // ffmpeg removes MP3 encoder delay; it does not stretch the performance.
 const decoded=spawnSync(process.env.FFMPEG_PATH||'ffmpeg',['-v','error','-i',source,'-ar','44100','-ac','2','-f','f32le','pipe:1'],{windowsHide:true,maxBuffer:10000000});
 if(decoded.status!==0)throw Error(String(decoded.stderr));
 const channels=[0,1].map(ch=>Float32Array.from({length:decoded.stdout.length/8},(_,n)=>decoded.stdout.readFloatLE(n*8+ch*4)));
 const loop=repeatDrumCycle({sampleRate:44100,channels,cycleBars:1});
 if(pcmStatistics(loop.channels).peak>=1)throw Error('Folded source would clip');
 const wav=encodePcm16(loop),path=output+'/'+String(i+1).padStart(2,'0')+'.wav';
 await writeFile(path,wav);
 parts.push({id:part.id,path,source,sourceHash:hash(sourceBytes),sha256:hash(wav),bpm:90,key:null,bars:4,cycleBars:1,frames:470400,sampleRate:44100,tailPolicy:'fold into one musical bar before repetition'});
}
await writeFile(output+'/manifest.json',JSON.stringify({version:1,parts},null,2)+'\n');
console.log('Prepared '+parts.length+' four-bar drum loops; original MP3s unchanged.');

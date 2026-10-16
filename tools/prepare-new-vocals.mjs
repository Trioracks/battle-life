// Additive import of the user's October 11 exports. Never rewrite source or v1 files.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url),output=new URL('assets/audio/ft/vocals-v2/',root),parts=[];
const hash=b=>createHash('sha256').update(b).digest('hex');
await mkdir(output,{recursive:true});
for(let i=0;i<14;i++){
 const source='stems/untitled - REC'+(i?'_'+(i+1):'')+'.wav',raw=await readFile(new URL(source,root));
 const converted=spawnSync(process.env.FFMPEG_PATH||'ffmpeg',['-v','error','-i',fileURLToPath(new URL(source,root)),'-af','atrim=start=0:end=10.666666666667,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.003,afade=t=out:st=10.6166666667:d=0.05','-ar','44100','-ac','2','-f','s16le','pipe:1'],{maxBuffer:5000000,windowsHide:true});
 if(converted.status!==0)throw Error(String(converted.stderr));
 const pcm=converted.stdout;if(pcm.length!==470400*4)throw Error('Expected four-bar vocal: '+source);
 let peak=0;for(let o=0;o<pcm.length;o+=2)peak=Math.max(peak,Math.abs(pcm.readInt16LE(o)));if(peak<100)throw Error('Silent source '+source);
 const wav=Buffer.alloc(44+pcm.length);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(44100,24);wav.writeUInt32LE(176400,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(pcm.length,40);pcm.copy(wav,44);
 const n=String(i+41),path='./assets/audio/ft/vocals-v2/'+n+'.wav';await writeFile(new URL(n+'.wav',output),wav);
 if(hash(await readFile(new URL(source,root)))!==hash(raw))throw Error('Source changed while preparing '+source);
 parts.push({id:'vocal-'+n,path,source,sourceHash:hash(raw),sha256:hash(wav),bpm:90,bars:4,key:'A minor',frames:470400,sampleRate:44100});
}
await writeFile(new URL('manifest.json',output),JSON.stringify({version:2,authorship:'User-recorded vocals. Original WAV files preserved.',alignment:'From common project start, first four bars at90BPM; export tails stay in the original WAVs.',parts},null,2)+'\n');
console.log('Prepared14 additional vocals; sources and previous40 unchanged.');

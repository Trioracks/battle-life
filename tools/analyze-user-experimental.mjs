import {mkdir,writeFile} from 'node:fs/promises';
import {decodeAudio,measureLoudness,signalEvidence} from './audio/experimental-analysis.mjs';
const results=[];
for(let track=1;track<=28;track++){
 const path=`Новая папка/beats 90 bpm/untitled - Track ${track}.wav`,signal=signalEvidence(decodeAudio(path)),loudness=measureLoudness(path);
 const item={track,path,signal,loudness};results.push(item);
 console.log(JSON.stringify({track,...loudness,seconds:signal.seconds,low:signal.lowEnergyBelow200,centroid:signal.centroidHz,peaks:signal.spectralPeaks.slice(0,4),chroma:signal.pitchClassEnergy.slice(0,5),bars:signal.barRms,tail:signal.tailRms,clipped:signal.clippedSamples}));
}
await mkdir('artifacts/user-experimental-v1',{recursive:true});
await writeFile('artifacts/user-experimental-v1/intake-analysis.json',JSON.stringify(results,null,2)+'\n');

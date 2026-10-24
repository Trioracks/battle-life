import {calibratedSourceBuffer} from './audio-levels.js?rev=60';
import {transformBeatBuffer} from './beat-result-dsp.js?rev=60';
import {transformVocalBuffer} from './vocal-result-dsp.js?rev=60';
import {arrangeSongBuffer} from './beat-song-form.js?rev=60';

// The worker uses the very same DSP as exports/previews. No sample-rate or
// quality reduction: only ownership of the CPU work changes.
export function prepareBeatPcm(context,buffer,part,duration){
 let out=calibratedSourceBuffer(context,buffer,part.sourceGainDb);
 if(part.vocal)out=transformVocalBuffer(context,out,part.vocal,part.loopSeconds);
 else if(part.result)out=transformBeatBuffer(context,out,part.result,part.loopSeconds);
 if(part.windows)out=arrangeSongBuffer(context,out,part.windows,duration,part.loopSeconds);
 return out;
}
function pcmBuffer(channels,sampleRate){return {sampleRate,length:channels[0].length,numberOfChannels:channels.length,duration:channels[0].length/sampleRate,getChannelData:i=>channels[i],copyToChannel:(samples,i)=>channels[i].set(samples)};}
const context={createBuffer(count,length,rate){return pcmBuffer(Array.from({length:count},()=>new Float32Array(length)),rate);}};
export function processBeatPcmMessage({id,channels,sampleRate,part,duration}){
 const out=prepareBeatPcm(context,pcmBuffer(channels,sampleRate),part,duration);
 return {id,sampleRate:out.sampleRate,channels:Array.from({length:out.numberOfChannels},(_,i)=>out.getChannelData(i))};
}

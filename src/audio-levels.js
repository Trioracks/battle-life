// A fixed, saved source gain, not a compressor or a playback-time normalizer.
export function calibratedSourceBuffer(context,buffer,gainDb){
 if(!Number.isFinite(gainDb)||gainDb===0)return buffer;
 const gain=10**(Math.max(-40,Math.min(12,gainDb))/20);
 const out=context.createBuffer(buffer.numberOfChannels,buffer.length,buffer.sampleRate);
 for(let ch=0;ch<buffer.numberOfChannels;ch++)out.copyToChannel(Float32Array.from(buffer.getChannelData(ch),x=>x*gain),ch);
 return out;
}
export function descriptorOutputGain(descriptor){
 return descriptor.levelVersion===1&&Number.isFinite(descriptor.outputGain)&&descriptor.outputGain>0&&descriptor.outputGain<=1?descriptor.outputGain:.7;
}

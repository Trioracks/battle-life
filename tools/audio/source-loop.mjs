// Lossless originals stay outside this module. Derived loops are stereo PCM16 at 44.1 kHz.
export function decodePcm16(wav){
  if(wav.toString('ascii',0,4)!=='RIFF'||wav.toString('ascii',8,12)!=='WAVE')throw new Error('Expected RIFF WAVE');
  let format,bytes;
  for(let offset=12;offset+8<=wav.length;){
    const id=wav.toString('ascii',offset,offset+4),size=wav.readUInt32LE(offset+4),start=offset+8;
    if(start+size>wav.length)throw new Error('Truncated WAV chunk');
    if(id==='fmt ')format={codec:wav.readUInt16LE(start),channels:wav.readUInt16LE(start+2),sampleRate:wav.readUInt32LE(start+4),bits:wav.readUInt16LE(start+14)};
    if(id==='data')bytes=wav.subarray(start,start+size);
    offset=start+size+(size%2);
  }
  if(!format||!bytes||format.codec!==1||format.bits!==16||![1,2].includes(format.channels)||format.sampleRate<8000||format.sampleRate>192000)throw new Error('Expected mono/stereo PCM16 WAV');
  const frames=bytes.length/(format.channels*2);if(!Number.isInteger(frames))throw new Error('Incomplete PCM frame');
  const channels=Array.from({length:format.channels},(_,ch)=>Float32Array.from({length:frames},(_,i)=>bytes.readInt16LE((i*format.channels+ch)*2)/32768));
  return {sampleRate:format.sampleRate,channels};
}
export function pcmStatistics(channels){
  let peak=0,power=0;
  for(const channel of channels)for(const sample of channel){if(!Number.isFinite(sample))throw new Error('Invalid PCM sample');peak=Math.max(peak,Math.abs(sample));power+=sample*sample;}
  return {peak,rms:Math.sqrt(power/(channels.length*channels[0].length))};
}
export function encodePcm16({sampleRate,channels}){
  const count=channels.length,frames=channels[0].length,wav=Buffer.alloc(44+frames*count*2);
  wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(count,22);wav.writeUInt32LE(sampleRate,24);wav.writeUInt32LE(sampleRate*count*2,28);wav.writeUInt16LE(count*2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(frames*count*2,40);
  for(let i=0;i<frames;i++)for(let ch=0;ch<count;ch++)wav.writeInt16LE(Math.round(Math.max(-1,Math.min(1,channels[ch][i]))*32767),44+(i*count+ch)*2);
  return wav;
}
export function deriveSourceLoop({sampleRate,channels}){
  if(!Number.isFinite(sampleRate)||sampleRate<8000||sampleRate>192000||!Array.isArray(channels)||![1,2].includes(channels.length))throw new Error('Invalid PCM source');
  const sourceFrames=Math.round(sampleRate*32/3);
  if(channels.some(channel=>channel.length<sourceFrames))throw new Error('Source too short for four bars');
  const source=channels.map(channel=>channel.subarray(0,sourceFrames));
  if(pcmStatistics(source).rms<.0001)throw new Error('Source is silent');
  // Windowed sinc low-pass resampling prevents aliasing when reducing 48 kHz to 44.1 kHz.
  const outputRate=44100,frames=470400,radius=24,phases=1024,cutoff=Math.min(1,outputRate/sampleRate)*.94;
  const kernels=Array.from({length:phases},(_,phase)=>{
    const values=new Float64Array(radius*2);let sum=0;
    for(let tap=0;tap<values.length;tap++){
      const x=tap-radius+1-phase/phases,angle=Math.PI*x*cutoff;
      values[tap]=(Math.abs(angle)<1e-10?cutoff:Math.sin(angle)/(Math.PI*x))*(.5+.5*Math.cos(Math.PI*x/radius));sum+=values[tap];
    }
    for(let tap=0;tap<values.length;tap++)values[tap]/=sum;
    return values;
  });
  const output=source.map(channel=>{
    const result=new Float32Array(frames);
    for(let i=0;i<frames;i++){
      const position=i*sampleRate/outputRate,base=Math.floor(position),kernel=kernels[Math.min(phases-1,Math.round((position-base)*phases))];let sample=0;
      for(let tap=0;tap<kernel.length;tap++){const n=base+tap-radius+1;sample+=(n<0||n>=sourceFrames?0:channel[n])*kernel[tap];}
      result[i]=sample;
    }
    return result;
  });
  const stats=pcmStatistics(output),gain=Math.min(.048/stats.rms,.23/stats.peak);
  for(const channel of output){for(let i=0;i<frames;i++)channel[i]*=gain*Math.min(1,i/(outputRate*.003),(frames-1-i)/(outputRate*.05));channel[0]=0;channel[frames-1]=0;}
  return {sampleRate:outputRate,channels:output};
}

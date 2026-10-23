import {pcmStatistics} from './source-loop.mjs';

export function repeatOneBarStem(pcm) {
  const bar=Math.round(pcm.sampleRate*8/3),length=pcm.channels[0].length;
  if(pcm.channels.length!==2||pcm.channels.some(c=>c.length!==length)||length<bar||length>bar+Math.round(pcm.sampleRate*.35))throw Error('Invalid one-bar source length');
  pcmStatistics(pcm.channels);
  const channels=pcm.channels.map(input=>{
    const output=new Float32Array(length+bar);
    for(let i=0;i<length;i++){output[i]+=input[i];output[i+bar]+=input[i];}
    return output;
  });
  return {sampleRate:pcm.sampleRate,channels};
}

export function prepareLeadLoop(pcm,{trimFrames}={}) {
  const frames=Math.round(pcm.sampleRate*32/3);
  if(pcm.channels.length!==2||pcm.channels[0].length!==pcm.channels[1].length)throw Error('Expected stereo PCM');
  const stats=pcmStatistics(pcm.channels);
  if(!Number.isInteger(trimFrames)||trimFrames<0||trimFrames>Math.round(pcm.sampleRate*.04)||pcm.channels.some(c=>c.subarray(0,trimFrames).some(v=>Math.abs(v)>.0001)))throw Error('Invalid or active prefix');
  if(stats.rms<.0001)throw Error('Silent lead');
  const length=pcm.channels[0].length-trimFrames;
  if(length>frames+pcm.sampleRate*6)throw Error('Excess lead decay length requires review');
  // An active 10ms window after four bars is a phrase conflict, not a tail to fold.
  const window=Math.round(pcm.sampleRate*.01),levels=[];
  for(let i=trimFrames;i<pcm.channels[0].length;i+=window)levels.push(pcmStatistics(pcm.channels.map(c=>c.subarray(i,i+window))).rms);
  const activeThreshold=Math.max(...levels)*.05;
  for(let i=frames+trimFrames;i<pcm.channels[0].length;i+=window)if(pcmStatistics(pcm.channels.map(c=>c.subarray(i,i+window))).rms>activeThreshold)throw Error('Active phrase exceeds four bars; no automatic truncation or folding');
  const tail=pcm.channels.map(c=>c.subarray(frames+trimFrames));
  const tailStats=tail[0].length?pcmStatistics(tail):{peak:0,rms:0};
  const channels=pcm.channels.map(input=>{
    const output=new Float32Array(frames);
    for(let i=trimFrames;i<input.length;i++)output[(i-trimFrames)%frames]+=input[i];
    return output;
  });
  return {sampleRate:pcm.sampleRate,channels,frames,tailFrames:Math.max(0,length-frames),paddedFrames:Math.max(0,frames-length),tailStats,activeThreshold,tailPolicy:length>frames?'Full active phrase retained in four-bar slot; only measured quiet post-phrase decay beyond four bars overlaps next cycle.':'Full source and decay retained; remainder of four-bar slot padded with silence. No phrase repetition, time stretch, pitch shift, or active truncation.'};
}

// Adjacent exported two-bar sets occupy fixed slots. Keep their decays as overlap,
// including the second decay at the next loop's start; never rescale musical time.
export function assembleAdjacentStems(first,second,{sampleRate,firstTrimFrames,secondTrimFrames}={}) {
  if (!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000) throw Error('Invalid sample rate');
  const seamFrame=Math.round(sampleRate*16/3),frames=seamFrame*2;
  for (const [pcm,trim] of [[first,firstTrimFrames],[second,secondTrimFrames]]) {
    if (pcm?.sampleRate!==sampleRate||!Array.isArray(pcm.channels)||pcm.channels.length!==2||pcm.channels[0].length!==pcm.channels[1].length) throw Error('Expected matching stereo PCM');
    pcmStatistics(pcm.channels);
    if (!Number.isInteger(trim)||trim<0||trim>Math.round(sampleRate*.04)) throw Error('Unknown or excessive measured trim prefix');
    if (pcm.channels.some(c=>c.subarray(0,trim).some(v=>Math.abs(v)>.0001))) throw Error('Refusing to trim active prefix');
    const length=pcm.channels[0].length-trim;
    if (length<seamFrame||length>seamFrame+Math.round(sampleRate*.35)) throw Error(`Source length ${length} incompatible with two-bar slot ${seamFrame}; review oversized active fragment/tail`);
  }
  const channels=[new Float32Array(frames),new Float32Array(frames)];
  for (const [pcm,trim,offset] of [[first,firstTrimFrames,0],[second,secondTrimFrames,seamFrame]]) {
    for(let ch=0;ch<2;ch++)for(let i=trim;i<pcm.channels[ch].length;i++)channels[ch][(offset+i-trim)%frames]+=pcm.channels[ch][i];
  }
  pcmStatistics(channels);
  return {channels,sampleRate,frames,seamFrame,tailPolicy:'Two fixed two-bar slots; first decay overlaps second onset; second decay wraps into next four-bar cycle. Only explicitly measured <=40ms quiet prefix removed. No fades, tempo change, pitch change, or active truncation.'};
}

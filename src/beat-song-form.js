const BAR_SECONDS=8/3;
function choice(key){
 let hash=2166136261;
 for(const char of key){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619);}
 hash^=hash>>>16;hash=Math.imul(hash,0x7feb352d);hash^=hash>>>15;hash=Math.imul(hash,0x846ca68b);return (hash^(hash>>>16))>>>0;
}

// Saved project identity and the first take define the form. A clean take or
// mastering changes the sound, but never the musical arrangement choices.
export function createBeatSongForm(beat){
 const recording=beat?.recording;
 if(beat?.stages?.length!==3||!recording?.mix||!recording.draft)return null;
 const key=String(beat.id)+':'+recording.draft.seed;
 return {bars:8,barSeconds:BAR_SECONDS,durationSeconds:64/3,introStage:choice(key+':intro')%3,outroStage:choice(key+':outro')%3,vocalOutro:choice(key+':vocal-outro')%4===0};
}

export function songPartWindows(form,stage){
 const windows=[];
 if(stage===form.introStage)windows.push({startBar:0,bars:2,sourceBar:0});
 windows.push({startBar:2,bars:4,sourceBar:0});
 if(stage===form.outroStage)windows.push({startBar:6,bars:2,sourceBar:2});
 if(stage===3&&form.vocalOutro)windows.push({startBar:6,bars:1,sourceBar:0});
 return windows;
}

// Assemble already processed source PCM, so the repeated vocal is the same
// active take. Each section has a tiny edge fade to avoid clicks at cuts.
export function arrangeSongSamples(input,rate,windows,durationSeconds){
 const output=new Float32Array(Math.round(durationSeconds*rate));
 if(!input.length)return output;
 const edge=Math.max(1,Math.round(rate*.004));
 for(const {startBar,bars,sourceBar=0} of windows){
  const start=Math.round(startBar*BAR_SECONDS*rate),end=Math.min(output.length,Math.round((startBar+bars)*BAR_SECONDS*rate)),source=Math.round(sourceBar*BAR_SECONDS*rate);
  for(let i=start;i<end;i++){
   const local=i-start,fade=Math.min(1,local/edge,(end-1-i)/edge);
   output[i]+=input[(source+local)%input.length]*Math.max(0,fade);
  }
 }
 return output;
}

export function arrangeSongBuffer(context,buffer,windows,durationSeconds,sourceLoopSeconds=buffer.duration){
 const rate=buffer.sampleRate,out=context.createBuffer(buffer.numberOfChannels,Math.round(durationSeconds*rate),rate),sourceLength=Math.round(sourceLoopSeconds*rate);
 for(let channel=0;channel<buffer.numberOfChannels;channel++)out.copyToChannel(arrangeSongSamples(buffer.getChannelData(channel).subarray(0,sourceLength),rate,windows,durationSeconds),channel);
 return out;
}

// Owned keyboard sounds for the writing work scene.
export function createLyricWorkAudio({contextFactory=()=>new AudioContext()}={}){
 let context=null,disposed=false,next=0,seed=17,blocked=false,error='',lastPhase='';const voices=new Set();
 const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296*2-1;};
 function stop(){for(const v of voices){try{v.source.stop();}catch{}v.dispose();}voices.clear();next=0;}
 async function unlock(){if(disposed)return false;try{context??=contextFactory();await context.resume();if(disposed)return false;blocked=false;error='';return true;}catch{error='Не удалось включить клавиатуру.';return false;}}
 function tick(){
  const c=context,source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain(),length=Math.round(c.sampleRate*.028),buffer=c.createBuffer(1,length,c.sampleRate),a=buffer.getChannelData(0);
  for(let i=0;i<a.length;i++)a[i]=noise()*Math.exp(-i/(c.sampleRate*.006));source.buffer=buffer;
  filter.type='bandpass';filter.frequency.value=650+(noise()+1)*800;filter.Q.value=.5;
  gain.gain.value=.045;source.connect(filter);filter.connect(gain);gain.connect(c.destination);
  const voice={source,dispose(){source.disconnect();filter.disconnect();gain.disconnect();voices.delete(voice);}};voices.add(voice);source.onended=()=>voice.dispose();source.start();next=c.currentTime+.055+(noise()+1)*.035+(seed%11===0?.22:0);
 }
 return {unlock,enableAudio:unlock,sync({phase,job,hidden=false}={}){
  if(disposed)return {audioError:'',needsGesture:false};
  if(phase==='work-out'&&lastPhase!=='work-out'){blocked=false;error='';}lastPhase=phase;
  const active=phase==='working'&&job?.projectId;
  if(hidden){if(active)blocked=true;stop();}
  else if(!active)stop();
  else if(!blocked&&context?.state==='running'&&context.currentTime>=next){try{tick();}catch{error='Не удалось воспроизвести клавиатуру.';stop();}}
  return {audioError:error,needsGesture:Boolean(active&&(blocked||!context||context.state!=='running'))};
 },dispose(){disposed=true;stop();void context?.close?.();}};
}

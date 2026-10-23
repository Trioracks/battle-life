import {prepareBeatPcm} from '../src/beat-pcm-runtime.js?rev=49';
import {createBeatPcmProcessor} from '../src/beat-pcm-background.js?rev=49';
import {beginnerById} from '../src/beat-beginner-bank.js?rev=49';
import {vocalById} from '../src/vocal-catalog.js?rev=49';
import {connectBeatResult,connectBeatResultMaster} from '../src/beat-result-dsp.js?rev=49';
import {descriptorOutputGain} from '../src/audio-levels.js?rev=43';
const rate=44100,results=document.querySelector('#results'),status=document.querySelector('#status'),diagnostics=document.querySelector('#diagnostics');
const require=(v,message)=>{if(!v)throw Error(message);};
function stats(channels,seconds){
 let peak=0,power=0,nonfinite=0,clipped=0,maxStep=0;const seams={};
 for(const c of channels)for(let i=0;i<c.length;i++){const x=c[i];if(!Number.isFinite(x))nonfinite++;peak=Math.max(peak,Math.abs(x));power+=x*x;if(Math.abs(x)>=1)clipped++;if(i)maxStep=Math.max(maxStep,Math.abs(x-c[i-1]));}
 // Raw adjacent-sample steps around musical boundaries, not a perceptual click verdict.
 for(const t of [0,16/3,32/3,16,seconds]){const i=Math.min(channels[0].length-1,Math.round(t*rate));seams[t]=Math.max(...channels.map(c=>Math.abs(c[i]-(i?c[i-1]:c.at(-1)))));}
 return {peak,rms:Math.sqrt(power/(channels.length*channels[0].length)),clipped,nonfinite,maxStep,boundarySteps:seams};
}
function wav(channels){
 const frames=channels[0].length,b=new ArrayBuffer(44+frames*4),v=new DataView(b),str=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
 str(0,'RIFF');v.setUint32(4,b.byteLength-8,true);str(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,2,true);v.setUint32(24,rate,true);v.setUint32(28,rate*4,true);v.setUint16(32,4,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,frames*4,true);
 for(let i=0;i<frames;i++)for(let c=0;c<2;c++)v.setInt16(44+i*4+c*2,Math.round(Math.max(-1,Math.min(1,channels[c][i]))*32767),true);return b;
}
function link(name,blob,parent){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.textContent='Скачать '+name;parent.append(a);return a;}
document.querySelector('#save-screenshot').addEventListener('click',async()=>{
 const output=document.querySelector('#screenshot-status');try{const text=document.querySelector('#qa-screenshot').value.trim().replace(/^data:image\/jpeg;base64,/,''),bytes=Uint8Array.from(atob(text),c=>c.charCodeAt(0));require(bytes.length<=2*1024*1024,'JPEG exceeds 2MB');const saved=await fetch('/__abstract-demo-output/qa-screenshot.jpg',{method:'POST',headers:{'Content-Type':'image/jpeg'},body:bytes});if(!saved.ok)throw Error(await saved.text());const result=await saved.json();output.textContent='Сохранено: '+result.path+' · SHA256 '+result.sha256;}catch(error){output.textContent='Ошибка: '+error.message;}
});
async function render(descriptor,buffers,solo=null){
 const frames=Math.round(descriptor.durationSeconds*rate),c=new OfflineAudioContext(2,frames,rate),master=connectBeatResultMaster(c,c.destination),gain=c.createGain();gain.gain.value=descriptorOutputGain(descriptor);gain.connect(master.input);const effects=[];
 require(descriptor.mix?.version===2,'Examples require current version 2 mix contract');
 for(const [i,part]of descriptor.parts.entries()){
  if(solo!==null&&Boolean(part.vocal)!==solo)continue;
  const source=c.createBufferSource();source.buffer=buffers[i];source.loop=true;source.loopEnd=part.windows?descriptor.durationSeconds:part.loopSeconds;
  let input=gain;if(part.result){const fx=connectBeatResult(c,part.result,gain);effects.push(fx);input=fx.input;}source.connect(input);source.start();source.stop(descriptor.durationSeconds);
 }
 const audio=await c.startRendering(),channels=[audio.getChannelData(0),audio.getChannelData(1)];effects.forEach(f=>f.dispose());master.dispose();return channels;
}
document.querySelector('#render').addEventListener('click',async event=>{
 event.target.disabled=true;const evidence={processing:'Runtime prepareBeatPcm + connectBeatResult + connectBeatResultMaster + descriptorOutputGain; OfflineAudioContext stereo 44100Hz. No normalization, added fades, approximated EQ, or storage access.',humanListening:false,examples:[],errors:[]};
 try{
  const response=await fetch('../artifacts/abstract-20261020/demos/fixtures.json');require(response.ok,'fixtures unavailable');const fixtures=await response.json(),decode=new OfflineAudioContext(2,1,rate);
  for(const example of fixtures.examples){
   status.textContent='Создание: '+example.label;const d=example.version.recipe.descriptor,buffers=[];
   const worker={created:0,jobs:0,results:0,errors:[],fallback:false},pcm=createBeatPcmProcessor({createWorker:()=>{worker.created++;const w=new Worker(new URL('../src/beat-pcm-worker.js?rev=49',import.meta.url),{type:'module'});w.addEventListener('message',e=>{worker.results++;if(e.data.error)worker.errors.push(e.data.error);});w.addEventListener('error',e=>worker.errors.push(e.message));return w;}});
   try{for(const part of d.parts){const asset=beginnerById(part.id)??vocalById(part.id);require(asset,'unknown source '+part.id);const response=await fetch(new URL('../'+asset.path.replace(/^\.\//,''),import.meta.url));require(response.ok,'source unavailable '+asset.path);const raw=await decode.decodeAudioData(await response.arrayBuffer());worker.jobs++;const prepared=await pcm.prepare(decode,raw,part,d.durationSeconds);
    // Exact runtime worker/reference parity, not a second renderer approximation.
    const reference=prepareBeatPcm(decode,raw,part,d.durationSeconds);require(prepared.length===reference.length,'worker frame mismatch');for(let ch=0;ch<prepared.numberOfChannels;ch++){const a=prepared.getChannelData(ch),b=reference.getChannelData(ch);for(let i=0;i<a.length;i++)require(a[i]===b[i],'worker PCM mismatch');}buffers.push(prepared);
   }}finally{pcm.dispose();}
   require(worker.created===1&&worker.jobs===worker.results&&!worker.errors.length,'actual worker processing required');
   const channels=await render(d,buffers),beat=stats(await render(d,buffers,false),d.durationSeconds),vocal=stats(await render(d,buffers,true),d.durationSeconds),metrics=stats(channels,d.durationSeconds);
   require(!metrics.nonfinite&&!metrics.clipped&&metrics.rms>0,'invalid rendered PCM');const bytes=wav(channels),sha256=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
   const row={label:example.label,sha256,frames:channels[0].length,durationSeconds:d.durationSeconds,sourceIds:d.parts.map(p=>p.id),worker,metrics,beat,vocal,vocalToBeatRmsDb:20*Math.log10(vocal.rms/beat.rms)};
   const saved=await fetch('/__abstract-demo-output/'+example.label+'.wav',{method:'POST',headers:{'Content-Type':'audio/wav'},body:bytes});if(!saved.ok)throw Error('local WAV save failed: '+await saved.text());row.saved=await saved.json();evidence.examples.push(row);
   const article=document.createElement('article'),title=document.createElement('h2');title.textContent=example.label;article.append(title);const a=link(example.label+'.wav',new Blob([bytes],{type:'audio/wav'}),article),audio=document.createElement('audio');audio.controls=true;audio.preload='none';audio.src=a.href;article.append(audio);const details=document.createElement('pre');details.textContent=JSON.stringify(row,null,2);article.append(details);results.append(article);
  }
  status.textContent='Готово: '+evidence.examples.length+' примеров. Проверка PCM пройдена; прослушивание человеком не выполнялось.';
 }catch(error){evidence.errors.push(error.stack??String(error));status.textContent='Ошибка: '+error.message;}
 const saved=await fetch('/__abstract-demo-output/render-evidence.json',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(evidence,null,2)});if(!saved.ok)evidence.errors.push('Evidence save failed: '+await saved.text());
 diagnostics.textContent=JSON.stringify(evidence,null,2);link('render-evidence.json',new Blob([JSON.stringify(evidence,null,2)],{type:'application/json'}),results);
});

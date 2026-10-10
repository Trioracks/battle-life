// Versioned, saved per project. Never consult live skills during playback.
const characters=['thin','muffled','crushed'];
export function normalizeBeatMix(value){
 if(value?.version!==1||!Number.isFinite(value.skill)||!characters.includes(value.character))return null;
 return {version:1,skill:Math.max(0,Math.min(100,value.skill)),character:value.character};
}
export function createBeatMix(id,skill=10){
 let hash=2166136261;
 for(const c of String(id))hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;
 return normalizeBeatMix({version:1,skill:Number.isFinite(skill)?skill:10,character:characters[hash%characters.length]});
}

const severity=profile=>Math.max(0,(80-profile.skill)/80);
export function describeBeatMix(value){
 const profile=normalizeBeatMix(value);
 if(!profile)return {label:'Архивное звучание',detail:'Без новой обработки. Исходное звучание проекта сохранено.'};
 const amount=severity(profile);
 const names={thin:'Тонкое звучание',muffled:'Глухое звучание',crushed:'Цифровая шероховатость'};
 const details={thin:'Недостаёт низа и плотности в середине.',muffled:'Детали приглушены, верх теряется.',crushed:'Слышны цифровой хруст и перегруз.'};
 return {label:amount?names[profile.character]:'Чистое звучание',detail:amount?(amount<.4?'Лёгкая окраска. ':'')+details[profile.character]:'Без искусственного ухудшения.',skill:profile.skill};
}

// Bit-depth reduction only, not sample-rate reduction. Odd curve length preserves zero.
export function beatMixCurve(value){
 const profile=normalizeBeatMix(value),amount=profile?severity(profile):0;
 const crushed=profile?.character==='crushed',wet=amount*(crushed?.85:.24),drive=1+amount*(crushed?6:2);
 const levels=2**(Math.round(14-amount*8)-1),curve=new Float32Array(65537);
 for(let i=0;i<curve.length;i++){
  const x=i/(curve.length-1)*2-1,soft=Math.tanh(x*drive)/drive;
  const shaped=crushed?Math.sign(soft)*Math.round(Math.abs(soft)*levels)/levels:soft;
  curve[i]=x*(1-wet)+shaped*wet;
 }
 return curve;
}

// A disposable bus after the existing .7 master gain; source buffers stay untouched.
export function connectBeatMix(context,value,destination){
 const profile=normalizeBeatMix(value),amount=profile?severity(profile):0,nodes=[];
 const dispose=()=>{for(const node of nodes){try{node.disconnect();}catch{/* Already disconnected. */}}};
 if(!amount)return {input:destination,dispose};
 const filter=(type,frequency,gain=0)=>{
  const n=context.createBiquadFilter();nodes.push(n);n.type=type;n.frequency.value=Math.min(frequency,context.sampleRate*.45);
  // Web Audio interprets low/high-pass Q in dB: Butterworth Q=.707 is -3.01 dB.
  n.Q.value=['lowpass','highpass'].includes(type)?-3.0103:.707;n.gain.value=gain;return n;
 };
 try{
  if(profile.character==='thin'){
   filter('highpass',20+500*amount*amount);filter('peaking',1300,-7*amount);
  }else if(profile.character==='muffled'){
   filter('highshelf',1600,-12*amount);filter('lowpass',20000/(1+6*amount));
  }else{
   filter('highpass',25);filter('lowpass',20000/(1+2*amount));
  }
  const shape=context.createWaveShaper();nodes.push(shape);shape.curve=beatMixCurve(profile);shape.oversample='none';
  for(let i=0;i<nodes.length;i++)nodes[i].connect(nodes[i+1]??destination);
  return {input:nodes[0],dispose};
 }catch(error){dispose();throw error;}
}

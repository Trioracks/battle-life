// Original short compositions. All layers share an A-minor pedal, never borrowed recordings.
const KICKS=[
  [0,6,8],[0,3,8,10],[0,7,8,14],[0,2,8,11],[0,6,10],[0,8,15],
  [0,5,8,13],[0,3,10],[0,2,7,8],[0,6,8,11],[0,8,10,14],
  [0,3,6,8],[0,7,10,15],[0,2,8,14],[0,5,8,10],
];
const MOTIFS=[
  [57,60,64,62,60,57,64,60],[64,67,69,67,64,60,62,57],
  [69,64,60,62,57,60,64,67],[60,62,64,60,57,64,62,57],
  [57,57,64,67,64,62,60,57],[64,60,57,60,67,64,62,60],
  [69,67,64,62,64,60,57,60],[57,62,60,64,62,67,64,57],
  [60,64,69,67,64,62,60,64],[67,64,60,57,60,62,64,57],
  [57,64,57,60,62,60,67,64],[64,62,60,64,69,67,64,60],
  [60,57,62,64,60,67,69,64],[69,64,67,60,64,62,57,60],
  [57,60,62,67,64,60,64,69],
];
const RHYTHMS=[
  [0,1,2.5,3,4,5.5,6,7],[0,.5,2,3.5,4.5,5,6,7.5],
  [0,1.5,2,3,4,5,6.5,7],[.5,1,2,3.5,4,5.5,6.5,7],
  [0,1,1.5,3,4.5,5,6,7.5],
];
const hz=midi=>440*2**((midi-69)/12);
const TAU=2*Math.PI;

export function renderBeginnerPart(kind,index,rate=44100){
  if(!['drums','theme','arrangement'].includes(kind)||!Number.isInteger(index)||index<0||index>14||
    !Number.isInteger(rate)||rate<8000||rate>96000)throw new RangeError('Unsupported beginner part');
  const beat=2/3,length=Math.round(rate*32/3),pcm=new Float32Array(length);
  let seed=0x12a9+index*7919+['drums','theme','arrangement'].indexOf(kind)*65537;
  const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;};
  function voice(at,duration,amplitude,type,frequency=220){
    const begin=Math.round(at*rate),count=Math.round(duration*rate);
    let previous=0;
    for(let frame=0;frame<count;frame++){
      const t=frame/rate,progress=frame/count,attack=Math.min(1,t/.005);
      const release=Math.min(1,(count-frame-1)/(rate*.025));
      let sample=0,envelope=1;
      if(type==='kick'){
        sample=Math.sin(TAU*(48*t+2.4*(1-Math.exp(-t*38))));
        envelope=attack*Math.exp(-t*17)*release;
      }else if(type==='snare'){
        sample=noise()*.75+Math.sin(TAU*185*t)*.25;
        envelope=attack*Math.exp(-t*23)*release;
      }else if(type==='hat'||type==='sweep'){
        const white=noise();sample=(white-previous)*.55;previous=white;
        envelope=type==='hat'?attack*Math.exp(-t*65)*release:Math.sin(Math.PI*progress)**2;
      }else if(type==='bass'){
        sample=Math.sin(TAU*frequency*t)+.18*Math.sin(TAU*frequency*2*t);
        envelope=Math.min(1,t/.015)*Math.exp(-t*4)*release;
      }else if(type==='pad'){
        sample=Math.sin(TAU*frequency*t)*.7+Math.sin(TAU*frequency*1.003*t)*.3;
        envelope=Math.sin(Math.PI*progress)**2;
      }else if(type==='bell'){
        sample=Math.sin(TAU*frequency*t)*.7+Math.sin(TAU*frequency*2.01*t)*.3;
        envelope=attack*Math.exp(-t*8)*release;
      }else{
        const phase=TAU*frequency*t;
        // A deliberately modest, slightly hollow home-keyboard tone.
        sample=Math.sin(phase)+(.12+index%3*.06)*Math.sin(phase*2)+.07*Math.sin(phase*3);
        envelope=Math.min(1,t/.012)*Math.exp(-t*(3+index%4))*release;
      }
      pcm[(begin+frame)%length]+=sample*envelope*amplitude;
    }
  }
  if(kind==='drums'){
    for(let bar=0;bar<4;bar++){
      const base=bar*4*beat,pattern=KICKS[index];
      for(const step of pattern)voice(base+step*beat/4,.32,.7,'kick');
      for(const step of [4,12])voice(base+step*beat/4+.007,.19,.34,'snare');
      for(let step=0;step<16;step+=2){
        if((step+bar+index)%11===0)continue;
        const swing=step%4===2?(index%3)*.012:0;
        voice(base+step*beat/4+swing,.07,step%4===0?.13:.08,'hat');
      }
      voice(base+((index+bar)%4*2+3)*beat/4,.085,.09,'bell',640+index*19);
      voice(base+.035,.31,.16,'bass',55);
      voice(base+(2+(index%3)*.25)*beat,.23,.1,'bass',bar%2?82.4069:55);
      if(bar===3&&index%3===1)voice(base+15*beat/4,.1,.11,'snare');
    }
  }else if(kind==='theme'){
    const motif=MOTIFS[index],timing=RHYTHMS[index%5];
    for(let half=0;half<2;half++)for(let note=0;note<8;note++){
      const midi=motif[(note+(half&&index%3===0?2:0))%8]+(index%4===3?12:0);
      voice((half*8+timing[note])*beat,(.45+(note+index)%3*.15)*beat,.22,'lead',hz(midi));
      if(note===2||note===6)voice((half*8+timing[note]+.5)*beat,.32,.035,'bell',hz(midi));
    }
    for(let bar=0;bar<4;bar++){
      for(const midi of [57,60,64])voice(bar*4*beat,3.9*beat,.025,'pad',hz(midi));
      voice((bar*4+2.5)*beat,.35,.035,'bell',hz([64,69,60][(bar+index)%3]));
    }
  }else{
    for(let bar=0;bar<4;bar++){
      const offset=(1.5+(index+bar)%3*.5)*beat;
      voice(bar*4*beat+offset,.42,.24,'bass',(index+bar)%4===0?41.20345:27.5);
      voice((bar*4+3.5)*beat,.2,.045,'bell',hz(MOTIFS[index][bar*2]+12));
    }
    const fill=RHYTHMS[index%5];
    for(let n=0;n<4;n++)voice((12+fill[n]/2)*beat,.25,.07,'lead',hz(MOTIFS[index][n]+12));
    voice((7.2+index%3*.1)*beat,.6,.035,'sweep');
    voice((15.1-index%4*.1)*beat,.5,.03,'sweep');
    for(const midi of [69,72,76])voice((8+index%4*.25)*beat,1.2,.018,'pad',hz(midi));
  }
  let peak=0;
  for(const value of pcm)peak=Math.max(peak,Math.abs(value));
  const gain=({drums:.26,theme:.21,arrangement:.19})[kind]/Math.max(peak,.001);
  // Sample-exact endpoints avoid a discontinuity even after PCM quantisation.
  const seam=Math.max(2,Math.round(rate*.002));
  for(let i=0;i<length;i++)pcm[i]*=gain*Math.min(1,i/seam,(length-1-i)/seam);
  return pcm;
}

// Thirty authored patterns per role: two independently voiced variations of 15 grooves.
// Timing is in quarter-note beats. All pitches belong to A natural minor.
const GROOVES=[
  {kick:[[0,1,2,3],[0,1,2,2.75,3]],snare:[[1,3],[1,3]],hat:[.5,1.5,2.5,3.5],open:true},
  {kick:[[0,1.75,2.5],[0,.75,2,3.25]],snare:[[1,3],[1,2.75]],hat:[.5,1.5,2.5,3.5],open:true},
  {kick:[[0,1,2.5,3],[0,1.5,2,3.5]],snare:[[0,2.5],[1.5,3.5]],hat:[0,.5,1,1.5,2,2.5,3,3.5]},
  {kick:[[0,.75,2,3.25],[0,1.5,2.75]],snare:[[],[]],hat:[0,.5,1,1.5,2,2.5,3,3.5]},
  {kick:[[],[]],snare:[[1,3],[.75,2.5,3.75]],hat:[0,.5,1,1.5,2,2.5,3,3.5]},
  {kick:[[0],[0,2.75]],snare:[[2],[3]],hat:[1.5,3.5]},
  {kick:[[0,1.75,3.5],[0,.75,2.75]],snare:[[2],[2,3.75]],hat:[0,.5,1,1.5,2,2.5,3,3.5]},
  {kick:[[0,1.5,2.75],[0,.75,2.5,3.75]],snare:[[1,3],[1,2.75]],hat:[0,.75,1.5,2,2.75,3.5]},
  {kick:[[0,1.6667,2.5],[0,.6667,2,3.6667]],snare:[[1,3],[1,3]],hat:[0,.6667,1,1.6667,2,2.6667,3,3.6667]},
  {kick:[[0,2],[0,1.75,2.5]],snare:[[1,3],[1,3]],hat:[0,.25,.5,.75,1,1.25,1.5,1.75,2,2.25,2.5,2.75,3,3.25,3.5,3.75]},
  {kick:[[0,2.5],[0,3]],snare:[[2],[1.5,3.5]],hat:[.5,1.5,2.5,3.5]},
  {kick:[[0,.75,2.25],[0,1.25,2.75,3.5]],snare:[[1,3],[1,3]],hat:[0,.5,1.75,2.5,3.25]},
  {kick:[[0,1,2,3],[0,.5,2,2.5]],snare:[[1,3],[.5,2.5]],hat:[0,1,2,3]},
  {kick:[[0,1.75,2.5],[0,.75,2.5,3.75]],snare:[[1,3],[1,3]],hat:[.5,1.5,2.25,2.75,3.5],open:true},
  {kick:[[0,2.75],[0,1.75]],snare:[[3],[2]],hat:[1.5,3.5]},
];
const MOTIFS=[
  [69,72,76,74,72,69,67,64],[69,64,67,72,71,67,64,60],
  [57,60,64,60,62,65,69,65],[76,72,69,67,64,67,72,74],
  [69,71,72,76,74,72,71,67],[64,60,57,60,62,64,67,64],
  [57,64,67,69,67,64,62,60],[72,71,67,64,65,69,67,64],
  [69,72,74,76,74,71,67,64],[57,60,64,67,69,67,64,60],
  [64,67,69,72,71,67,65,64],[69,64,72,67,74,71,67,64],
  [57,57,64,62,60,60,67,64],[76,74,72,69,71,67,64,60],
  [69,64,60,57,62,65,64,60],
];
const MELODY_TIMES=[
  [0,.5,1.5,2,3,4,5.5,7],[.5,1.5,2.5,3.5,4.5,5.5,6.5,7.5],
  [0,1,2.5,3,4,5.5,6,7.5],[0,.75,1.5,2.75,4,4.75,6,7],
  [.5,1.25,2,3.5,4.75,5.5,6.25,7.5],[0,3,4.5,7],
  [0,1.75,3.5,4,5.75,7.5],[0,.75,2.25,3.5,4.75,5.5,6.75,7.5],
  [0,.6667,1.6667,2.6667,4,4.6667,5.6667,7.6667],
  [0,.25,.75,1.5,2,2.25,2.75,3.5,4,4.25,4.75,5.5,6,6.25,6.75,7.5],
  [0,2,4,6],[.75,1.5,2.75,3.25,4.75,5.25,6.75,7.5],
  [0,1,2,3,4,5,6,7],[.5,1.25,2.5,3.75,4.5,5.25,6.5,7.75],
  [0,2.75,4.5,7.25],
];
const TIMBRES=[['pluck','organ'],['clav','bell'],['reed','rhodes'],['flute','mallet'],['glass','pluck'],['rhodes','flute'],['pulse','organ'],['clav','reed'],['mallet','rhodes'],['pluck','pulse'],['string','glass'],['bell','clav'],['organ','reed'],['glass','mallet'],['flute','string']];
const BASS_TIMES=[
  [[0,1,2,3],[.5,1.5,2.5,3.5]],[[.5,1.5,2.5,3.5],[0,.75,2,2.75,3.5]],
  [[0,1,2.5,3],[0,1.5,2,3.5]],[[0,.75,2,3.25],[.5,1.75,2.5,3.75]],
  [[0,1.5,2.75],[.5,1.25,2,3.5]],[[0],[0,2.75]],
  [[0,2.75],[0,1.75,3.5]],[[0,.75,2.25,3.5],[.5,1.25,2.75,3.75]],
  [[0,.6667,2,2.6667],[.6667,1.6667,2.6667,3.6667]],
  [Array.from({length:16},(_,i)=>i/4),[0,.25,.75,1,1.5,1.75,2,2.25,2.75,3,3.5,3.75]],
  [[0],[0]],[[.75,1.5,2.75],[.25,1.75,2.5,3.75]],
  [[0,1,2,3],[0,.5,2,2.5]],[[.5,1.25,2.5,3.25],[0,.75,1.5,2.75,3.5]],
  [[0,2.75],[.75,3.25]],
];
const hz=midi=>440*2**((midi-69)/12),TAU=2*Math.PI;
const validate=(kind,index)=>{if(!['drums','theme','arrangement'].includes(kind)||!Number.isInteger(index)||index<0||index>=30)throw new RangeError('Unsupported expanded part');};
export function expandedEvents(kind,index){
  validate(kind,index);
  const family=Math.floor(index/2),variant=index%2,events=[];
  const add=(beat,duration,voice,midi=69,gain=1)=>events.push({beat,duration,voice,midi,gain});
  if(kind==='drums'){
    const groove=GROOVES[family];
    for(let bar=0;bar<4;bar++){
      for(const t of groove.kick[variant])add(bar*4+t,.52,'kick',33+family%3,.82);
      for(const t of groove.snare[variant])add(bar*4+t,.3,'snare',57,.4);
      for(const [n,t] of groove.hat.entries())add(bar*4+t+(variant&&family===8?.04:0),groove.open?.38:.1,groove.open?'openhat':'hat',85,(n%2?.105:.16)*(variant?.82:1));
      if(family!==5&&family!==14){
        const t=variant?3.25:.75;add(bar*4+t,.2,variant?'wood':'rim',76+bar,.18);
        if(bar===3)add(bar*4+3.75,.16,variant?'rim':'wood',76,.15);
      }
    }
  }else if(kind==='theme'){
    const timing=MELODY_TIMES[family],motif=MOTIFS[family],voice=TIMBRES[family][variant];
    for(let half=0;half<2;half++)for(let n=0;n<timing.length;n++){
      const offset=variant?(family===5||family===10?.5:.25):0;
      const at=half*8+(timing[n]+offset)%8;
      const length=family===10?1.8:family===5||family===14?1.2:family===9?.2:variant?.36:.58;
      const midi=motif[(n+half*(variant?2:0))%motif.length]+(variant&&family%3===0?-12:0);
      add(at,length,voice,midi,n%3===0?.45:.33);
      if(family===2||family===10||family===12)add(at,length,voice,midi===57?64:midi-12,.11);
    }
  }else{
    const timing=BASS_TIMES[family][variant],voice=variant?'bass-reed':'bass-sub';
    for(let bar=0;bar<4;bar++)for(let n=0;n<timing.length;n++){
      const duration=family===10?3.92:family===5?1.65:family===9?.2:family===12?.3:family===14?1.25:variant?.48:.72;
      const notes=variant?[33,40,45,36]:[33,33,40,33];
      add(bar*4+timing[n],duration,voice,notes[(n+bar%2)%4],.62);
    }
  }
  return events.sort((a,b)=>a.beat-b.beat);
}
export function renderExpandedPart(kind,index,rate=44100){
  validate(kind,index);if(!Number.isInteger(rate)||rate<8000||rate>96000)throw new RangeError('Unsupported sample rate');
  const pcm=new Float32Array(Math.round(rate*32/3)),events=expandedEvents(kind,index);
  let seed=0x52637+index*7919;const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;};
  for(const event of events){
    const start=Math.round(event.beat*2/3*rate),count=Math.round(event.duration*2/3*rate),freq=hz(event.midi),type=event.voice;
    let lastNoise=0;
    for(let i=0;i<count;i++){
      const t=i/rate,p=i/count,phase=TAU*freq*t,attack=Math.min(1,t/.004),release=Math.min(1,(count-1-i)/(rate*.018));
      let sample=0,envelope=attack*release;
      if(type==='kick'){sample=Math.sin(TAU*((43+index%5*2)*t+2.1*(1-Math.exp(-t*40))))+.09*noise()*Math.exp(-t*90);envelope*=Math.exp(-t*(12+index%3*2));}
      else if(type==='snare'){sample=.76*noise()+.24*Math.sin(TAU*(165+index%4*17)*t);envelope*=Math.exp(-t*22);}
      else if(type==='hat'||type==='openhat'){const white=noise();sample=(white-lastNoise)*.55;lastNoise=white;envelope*=Math.exp(-t*(type==='hat'?65:16));}
      else if(type==='rim'){sample=.6*Math.sin(TAU*820*t)+.4*Math.sin(TAU*1390*t);envelope*=Math.exp(-t*70);}
      else if(type==='wood'){sample=Math.sin(TAU*470*t)+.25*Math.sin(TAU*763*t);envelope*=Math.exp(-t*38);}
      else if(type.startsWith('bass')){sample=Math.sin(phase)+.22*Math.sin(phase*2)+(type==='bass-reed'?.12*Math.sin(phase*3)+.06*Math.sin(phase*5):0);envelope=Math.min(1,t/.011)*release*(.72+.28*Math.exp(-t*8));}
      else if(type==='bell'||type==='glass'){sample=.7*Math.sin(phase)+.21*Math.sin(phase*2.01)+.09*Math.sin(phase*(type==='glass'?3.99:3));envelope*=Math.exp(-t*5);}
      else if(type==='mallet'){sample=Math.sin(phase)*Math.exp(-t*3)+.25*Math.sin(phase*3)*Math.exp(-t*16);envelope*=Math.exp(-t*4);}
      else if(type==='flute'){sample=Math.sin(phase+.015*Math.sin(TAU*5*t))+.07*Math.sin(phase*2);envelope=Math.min(1,t/.035)*release*(.72+.28*Math.sin(Math.PI*p));}
      else if(type==='organ'){sample=.64*Math.sin(phase)+.23*Math.sin(phase*2)+.13*Math.sin(phase*4);envelope*=.82+.18*Math.exp(-t*8);}
      else if(type==='rhodes'){sample=Math.sin(phase+.65*Math.sin(phase*2)*Math.exp(-t*9))+.09*Math.sin(phase*3);envelope*=Math.exp(-t*2.5);}
      else if(type==='string'){sample=.68*Math.sin(phase)+.18*Math.sin(phase*2)+.09*Math.sin(phase*3)+.05*Math.sin(phase*4);envelope=Math.min(1,t/.08)*release;}
      else if(type==='reed'){sample=Math.sin(phase)+.22*Math.sin(phase*3)+.08*Math.sin(phase*5);envelope*=.8+.2*Math.exp(-t*6);}
      else if(type==='clav'){sample=Math.sin(phase)+.35*Math.sin(phase*2)*Math.exp(-t*15)+.17*Math.sin(phase*4);envelope*=Math.exp(-t*8);}
      else if(type==='pulse'){sample=Math.sin(phase)+.31*Math.sin(phase*3)+.17*Math.sin(phase*5);envelope*=Math.exp(-t*5);}
      else {sample=Math.sin(phase)+.2*Math.sin(phase*2)*Math.exp(-t*10)+.13*Math.sin(phase*3);envelope*=Math.exp(-t*7);}
      pcm[(start+i)%pcm.length]+=sample*envelope*event.gain;
    }
  }
  let peak=0,power=0;for(const value of pcm){peak=Math.max(peak,Math.abs(value));power+=value*value;}
  const target=kind==='drums'?.047:kind==='theme'?.043:.054;
  const gain=Math.min(target/Math.sqrt(power/pcm.length),({drums:.28,theme:.23,arrangement:.25})[kind]/peak),seam=Math.round(rate*.002);
  for(let i=0;i<pcm.length;i++)pcm[i]*=gain*Math.min(1,i/seam,(pcm.length-1-i)/seam);
  pcm[0]=0;pcm[pcm.length-1]=0;
  return pcm;
}

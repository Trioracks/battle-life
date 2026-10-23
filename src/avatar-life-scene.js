// Portrait-only sets. The canonical avatar and gameplay skeleton stay untouched.
export const LIFE_STAGES=['school','college','army','work','university','rehearsal','workshop','school-group','barbecue'];
export function lifeAppearance(appearance,stage){
 const young=['school','school-group','college','university'].includes(stage);
 return {...appearance,...(young?{beard:'none',mustache:'none'}:{}),...(stage==='school'?{top:'sweater',topColor:'green',bottom:'jeans',bottomColor:'blue'}:{}),...(stage==='army'?{hair:'buzz',beard:'none',mustache:'none',top:'shirt',topColor:'olive',bottom:'sports',bottomColor:'olive',footwear:'boots',footwearColor:'black'}:{}),...(stage==='work'?{top:'tank',topColor:'grey',bottom:'jeans',bottomColor:'blue'}:{})};
}
export function addLifeScene({scene,model,actor,stage,box,ellipsoid,addCompanion}){
 const b=(pos,size,color)=>box(scene,pos,size,color),chair=(x,z)=>{b([x,.45,z],[.45,.08,.42],'#70523b');b([x,.8,z-.2],[.45,.6,.06],'#70523b');for(const dx of [-.17,.17])for(const dz of [-.16,.16])b([x+dx,.22,z+dz],[.04,.45,.04],'#4b4b43');};
 const table=(x,z,color='#8b704d')=>{b([x,.75,z],[1.2,.08,.65],color);for(const dx of [-.5,.5])for(const dz of [-.25,.25])b([x+dx,.37,z+dz],[.05,.74,.05],'#555953');};
 if(stage==='barbecue'){
  b([0,-.05,0],[16,.1,16],'#74834c');
  for(const [x,z,h]of [[-2,-2,2.6],[1.7,-2.8,3],[3,-1,2.7],[-3,1,2.9]]){b([x,h/2,z],[.15,h,.15],'#66513b');ellipsoid(scene,[x,h,z],[.9,1.1,.8],'#4c6d3f');}
  for(const z of [-1.8,-1.4])b([0,.45,z],[2.3,.08,.25],'#7f6646');
  b([-.65,.72,.55],[.8,.16,.45],'#3d4240');for(const x of [-.97,-.33])for(const z of [.39,.71])b([x,.34,z],[.035,.68,.035],'#52534c');
  for(let i=0;i<5;i++){b([-.96+i*.15,.824,.53],[.025,.025,.68],'#a7a69a');for(const z of [.4,.53,.66])b([-.96+i*.15,.86,z],[.09,.07,.10],'#a86e43');}
  table(1.7,.2);b([1.7,.81,.2],[.35,.025,.25],'#e4dcc1');b([1.98,.92,.2],[.09,.25,.09],'#506c46');
  addCompanion?.({position:[-1.25,0,-.9],yaw:.3,look:{hair:'buzz',face:'square',beard:'short',top:'tee',topColor:'olive'},clip:'idle'});
  addCompanion?.({position:[1.1,0,-1.2],yaw:-.3,look:{hair:'messy',face:'long',beard:'none',top:'shirt',topColor:'red'},clip:'idle'});
  actor.rotation.y=.12;return {distance:4.4,lower:-.4,directionX:-.12};
 }
 b([0,-.05,0],[12,.1,12],'#867b66');b([0,1.5,-2],[8,3,.1],'#b0b19b');b([-2,1.5,0],[.1,3,5],'#c2bdab');b([-1.93,1.6,-.3],[.04,1.1,1.1],'#91afb0');
 const head=model.getObjectByName('head');head?.rotateZ(stage==='army'?.13:stage==='school'?-.1:.04);actor.rotation.y=stage==='work'?-.32:stage==='college'?.22:-.13;
 if(stage==='school'||stage==='school-group'||stage==='university'){
  chair(0,-.15);table(0,.48);b([.2,.803,.45],[.35,.016,.25],'#e1dcc2');b([-.18,.82,.5],[.04,.03,.28],'#354c68');
  b([0,1.6,-1.91],[2.4,.9,.06],stage==='university'?'#d2d1bb':'#315750');
  for(const x of [-1.2,1.2]){table(x,-.9);chair(x,-1.4);}b([1.4,.8,-1.8],[.6,1.6,.3],'#765e44');
  if(stage==='school-group'){
   addCompanion?.({position:[-1.2,0,-1.25],yaw:.25,look:{hair:'messy',face:'square',beard:'none',top:'shirt',topColor:'white'},clip:'seated'});
   addCompanion?.({position:[1.2,0,-1.25],yaw:-.3,look:{hair:'short',face:'long',beard:'none',top:'sweater',topColor:'grey'},clip:'seated'});
  }
 }else if(stage==='army'){
  b([0,.42,-.2],[1,.12,.75],'#485448');b([-.3,.5,-.4],[.38,.1,.25],'#b2ae97');
  for(const x of [-1.3,1.3]){for(const y of [.45,1.45]){b([x,y,-1.05],[.8,.13,1.8],'#535e4b');b([x,y+.1,-1.68],[.6,.12,.28],'#b9b7a2');}for(const z of [-1.9,-.2])for(const dx of [-.4,.4])b([x+dx,1,z],[.045,2,.045],'#686e66');}
 }else if(stage==='work'){
  b([0,1.0,.44],[.65,.44,.4],'#ac9469');b([.01,1,.655],[.04,.44,.01],'#bdb08a');
  for(const x of [-1.15,1.2])for(let row=0;row<4;row++)for(let col=0;col<2;col++)b([x+col*.42,.2+row*.24,-.8],[.4,.22,.65],'#b49c73');
  b([0,1.5,-1.9],[2.3,1.7,.12],'#4d5b61');b([0,.6,-1.3],[2.4,.1,1.3],'#59666b');
 }else if(stage==='rehearsal'){
  chair(0,-.12);const guitar=ellipsoid(scene,[.03,.91,.32],[.22,.28,.06],'#774d29');guitar.rotation.z=-.18;
  const neck=b([.35,1.16,.33],[.07,.65,.055],'#a3895b');neck.rotation.z=-.65;
  b([-1,.46,-.7],[.7,.85,.45],'#252e30');b([-1,.48,-.46],[.6,.65,.04],'#59615f');
  for(const x of [.9,1.45]){b([x,.4,-1.1],[.45,.6,.45],'#7b4c3c');b([x,.73,-1.1],[.5,.03,.5],'#b5afa3');}
 }else{
  chair(0,-.15);table(0,.48,'#75827c');b([.3,.88,.45],[.3,.2,.2],'#465f6b');b([.28,1.0,.45],[.38,.04,.07],'#a3aca7');
  b([0,1.55,-1.85],[1.7,.85,.05],'#687e7a');for(const x of [-.6,-.2,.2,.6]){b([x,1.6,-1.79],[.05,.43,.03],'#a8aaa0');b([x,1.8,-1.79],[.16,.1,.04],'#a8aaa0');}
  if(stage==='workshop'){b([-.38,.84,.48],[.35,.1,.25],'#4d6054');for(const x of [-.48,-.35,-.22])b([x,.9,.48],[.03,.03,.1],'#bcac70');}
 }
 return {distance:stage==='school-group'?3.9:stage==='work'?3.3:2.65,lower:stage==='work'?-.45:-.25,...(stage==='school-group'?{directionX:-.08}:{})};
}

import {recordingShot} from './recording-shots.js?rev=41';
import {BEAT_RULES} from './beat-catalog.js?rev=41';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=x=>{const t=clamp(x);return t*t*(3-2*t);};
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const inside=(p,b)=>p.every((v,i)=>v>b.min[i]-.08&&v<b.max[i]+.08);
function safePoint(point,bounds){
 if(!bounds)return point;
 const p=point.map((v,i)=>clamp(v,bounds.min[i],bounds.max[i])),boxes=bounds.obstacles??[];
 if(!boxes.some(b=>inside(p,b)))return p;
 const candidates=[];
 for(const b of boxes)for(let axis=0;axis<3;axis++)for(const side of ['min','max']){const c=[...p];c[axis]=b[side][axis]+(side==='min'?-.12:.12);candidates.push(c);}
 const clear=candidates.filter(c=>c.every((v,i)=>v>=bounds.min[i]&&v<=bounds.max[i])&&!boxes.some(b=>inside(c,b)));
 clear.sort((a,b)=>distance(a,p)-distance(b,p));return clear[0]??p;
}
export function workCameraFrame(descriptor,{reducedMotion=false}={}){
 if(!descriptor?.job)return null;
 const kind=descriptor.writing?'lyrics':descriptor.performance==='rapping'?'vocal':'beat',progress=clamp(descriptor.chainProgress?.overall??descriptor.job.elapsed/descriptor.job.total);
 if(kind!=='vocal')return {kind,progress};
 // advanceCreativeWork maps one job to BEAT_RULES.workSeconds active seconds.
 const durationSeconds=BEAT_RULES.workSeconds,elapsedSeconds=clamp(descriptor.job.elapsed/descriptor.job.total)*durationSeconds;
 return {kind,progress,elapsedSeconds,durationSeconds,reducedMotion,shot:recordingShot({elapsedSeconds,durationSeconds,reducedMotion})};
}
export function workCameraPose({kind,progress,shot,headPose,desk,bed,lamp,bounds}){
 const p=clamp(Number.isFinite(progress)?progress:0),head=headPose.position,q=headPose.quaternion??[0,0,0,1];
 const forward=[-2*(q[0]*q[2]+q[1]*q[3]),-2*(q[1]*q[2]-q[0]*q[3]),-1+2*(q[0]**2+q[1]**2)],endTarget=head.map((v,i)=>v+forward[i]);
 if(p===1)return {position:[...head],target:endTarget,roll:0};
 const u=smooth(Math.min(1,p/.82)),blend=smooth((p-.8)/.2),focus=[head[0],head[1]-.15,head[2]],center=desk??head;
 let position,roll=0;
 if(kind==='vocal'&&shot){
  const bob=shot.bob, mic=[center[0]+1.2,head[1]+.12+bob,center[2]-.15],rear=[center[0]+.55,head[1]+.23+bob,center[2]+1.05];
  position=shot.phase==='rear'?rear:mic;
  const target=shot.phase==='mic'?[center[0]+.32,head[1]-.08,center[2]-.5]:[center[0]+.15,head[1]-.16,center[2]-.7];
  return {position:safePoint(mix(position,head,blend),bounds),target:mix(target,endTarget,blend),roll:0};
 }else if(kind==='lyrics'){
  const a=[(bed[0]+head[0])*.5,head[1]+.32,.4],b=[head[0]-.8,head[1]+.55,1.4],c=[head[0]+1.1,head[1]+.95,1.35],d=[lamp[0]+.9,Math.min(lamp[1]-.15,head[1]+1),head[2]+.65];
  position=a.map((v,i)=>(1-u)**3*v+3*(1-u)**2*u*b[i]+3*(1-u)*u*u*c[i]+u**3*d[i]);
  const sway=Math.sin(p*Math.PI*8)*.015*Math.sin(p*Math.PI);position[0]+=sway;position[1]+=sway*.35;
  roll=Math.sin(p*Math.PI)*Math.sin(p*Math.PI*2)*4*Math.PI/180*(1-blend);
 }else{
  const angle=(-150+130*u)*Math.PI/180;
  position=[center[0]+Math.sin(angle)*1.25,head[1]+.35+Math.sin(u*Math.PI)*.15,center[2]+Math.cos(angle)*1.25];
 }
 return {position:safePoint(mix(position,head,blend),bounds),target:mix(focus,endTarget,blend),roll};
}

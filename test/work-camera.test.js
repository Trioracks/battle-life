import test from 'node:test';
import assert from 'node:assert/strict';
import {workCameraPose,workCameraFrame} from '../src/work-camera.js';
import {creativeFixture} from './helpers/creative-fixtures.js';
import {startCreativeChain,pauseCreativeChain} from '../src/creative-workflow.js';
import {advanceCreativeWork,creativeWorkDescriptor} from '../src/home-creative-work.js';
import {BEAT_RULES} from '../src/beat-catalog.js';
const input={headPose:{position:[4.48,1.295,-.12],quaternion:[0,0,0,1]},desk:[4.48,.85,-.02],bed:[1.84,.95,-.8],lamp:[4.05,2.37,-.1],bounds:{min:[.25,1.05,-1.52],max:[8.25,2.7,1.62],obstacles:[{min:[3.825,.71,-1.18],max:[5.075,1.53,-.48]}]}};
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
for(const kind of ['beat','vocal','lyrics'])test(kind+' path stays bounded, deterministic and returns to the actual head',()=>{
 const before=JSON.stringify(input);
 for(let n=0;n<=100;n++){
  const p=n/100,pose=workCameraPose({...input,kind,progress:p});
  assert.deepEqual(workCameraPose({...input,kind,progress:p}),pose);assert.ok(Math.abs(pose.roll)<=4*Math.PI/180);
  pose.position.forEach((v,i)=>assert.ok(v>=input.bounds.min[i]&&v<=input.bounds.max[i]));
  for(const box of input.bounds.obstacles)assert.equal(pose.position.every((v,i)=>v>box.min[i]&&v<box.max[i]),false);
  if(n){const previous=workCameraPose({...input,kind,progress:p-.01});assert.ok(distance(previous.position,pose.position)<.35);}
 }
 assert.deepEqual(workCameraPose({...input,kind,progress:1}).position,input.headPose.position);
 assert.equal(JSON.stringify(input),before);
});
test('lyrics camera differs from music and fallback gets outside a tall obstruction',()=>{
 assert.notDeepEqual(workCameraPose({...input,kind:'lyrics',progress:.25}),workCameraPose({...input,kind:'beat',progress:.25}));
 const pose=workCameraPose({...input,kind:'beat',progress:.5,bounds:{...input.bounds,obstacles:[{min:[3,0,-1.5],max:[4,3,1.5]}]}});
 assert.ok(pose.position[0]<3||pose.position[0]>4||pose.position[2]<-1.5||pose.position[2]>1.5);
});
for(const kind of ['beat','lyrics'])test(kind+' chain drives one camera path across stages, pauses and reloads without extra XP',()=>{
 const f=creativeFixture(kind);let state=startCreativeChain(f.state,{kind,projectId:f.projectId},f.skills,()=>.4).state,last=0;
 for(let stage=0;stage<3;stage++){
  state=advanceCreativeWork(state,3,null,f.skills).state;
  const before=JSON.stringify(state),descriptor=creativeWorkDescriptor(state,f.skills),frame=workCameraFrame(descriptor);
  assert.equal(frame.kind,kind);assert.ok(frame.progress>last);last=frame.progress;
  const pose=workCameraPose({...input,...frame});assert.equal(JSON.stringify(state),before);
  const paused=pauseCreativeChain(state),restored=JSON.parse(JSON.stringify(paused));
  state=startCreativeChain(restored,{kind,projectId:f.projectId},f.skills,()=>.9).state;
  assert.deepEqual(workCameraPose({...input,...workCameraFrame(creativeWorkDescriptor(state,f.skills))}),pose);
  assert.equal(state[kind==='beat'?'music':'writing'].practice,descriptor.writing?JSON.parse(before).writing.practice:JSON.parse(before).music.practice);
  const d=creativeWorkDescriptor(state,f.skills),remaining=(d.job.total-d.job.elapsed)/d.job.total*BEAT_RULES.workSeconds;
  state=advanceCreativeWork(state,remaining+.001,null,f.skills).state;
 }
});
test('recording frame uses vocal only for draft/clean; missing work yields no camera',()=>{
 for(const kind of ['draft','clean'])assert.deepEqual(workCameraFrame({recording:true,job:{kind,elapsed:5,total:10},performance:'rapping'}),{kind:'vocal',progress:.5});
 assert.equal(workCameraFrame({job:null}),null);
});

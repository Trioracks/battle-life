import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assetPath} from './helpers/apartment-assets.js';
import {ApartmentMotion} from '../src/apartment-v3-motion.js';
import {ApartmentTime} from '../src/apartment-v3-time.js';
import {prepareApartmentConfig,advanceHomeFrame} from '../src/apartment-v3-runtime.js';
import {CameraModes,cameraPose} from '../src/apartment-v3-camera.js';
import {PerspectiveCamera,Vector3} from '../vendor/three/three.module.js';

const config=prepareApartmentConfig(JSON.parse(fs.readFileSync(assetPath('scene.json'),'utf8')));
test('new game defaults to 3D, temporarily sleeps in 2D and restores after standing',()=>{
 const camera=new CameraModes();assert.equal(camera.mode,'3D');
 camera.onMotionEvent({type:'started',id:'bed'});assert.equal(camera.mode,'2D');
 camera.onMotionState({clip:'idle',phase:'return-in'});assert.equal(camera.mode,'2D');
 camera.onMotionState({clip:'idle',phase:'idle'});assert.equal(camera.mode,'3D');
 camera.reset({initialMode:'2D'});assert.equal(camera.mode,'2D');
 camera.onMotionEvent({type:'started',id:'bed'});camera.onMotionState({clip:'idle',phase:'idle'});assert.equal(camera.mode,'2D');
});
test('medium framing uses 75 percent of the previous overview height, not another scene',()=>{
 const pose=cameraPose('2D',new ApartmentMotion(config),1.63,{aspect:1280/900});
 const expected=2*Math.atan(5.025/(2*8/Math.cos(8*Math.PI/180)))*180/Math.PI;
 assert.ok(Math.abs(pose.fov-expected)<1e-10);assert.equal(pose.position[2],8);
});
function fixture(mode){
 const motion=new ApartmentMotion(config),clock=new ApartmentTime({day:2,minutes:720}),camera=new CameraModes();camera.mode=mode;
 const step=()=>{const frame=advanceHomeFrame(motion,clock,.05);for(const event of frame.events)camera.onMotionEvent(event);camera.onMotionState(motion);return frame;};
 const until=predicate=>{for(let i=0;i<3000&&!predicate();i++)step();assert.ok(predicate(),`motion stalled in ${motion.phase}`);};
 return {motion,clock,camera,step,until};
}

// Restoring at completed rather than standing, losing the saved mode, or missing
// either wake branch must fail these real motion and clock integrations.
for(const initial of ['2D','3D'])for(const wake of ['clock','early'])test(`${initial} sleep restores its camera only after fully standing on ${wake} wake`,()=>{
 const f=fixture(initial);f.camera.yaw=.4;f.camera.pitch=-.2;f.motion.interact('bed');
 f.until(()=>f.motion.phase==='black');assert.equal(f.camera.mode,initial,'approach retains the selected camera');
 f.until(()=>f.motion.sleeping&&f.motion.phase==='perform');assert.equal(f.camera.mode,'2D');
 assert.equal(f.camera.yaw,.4);assert.equal(f.camera.pitch,-.2);
 if(wake==='early')assert.equal(f.motion.wakeUp(),true);
 f.until(()=>f.motion.phase==='return-in');assert.equal(f.camera.mode,'2D','completed is earlier than standing');
 f.until(()=>f.motion.phase==='idle');assert.equal(f.camera.mode,initial);
 f.motion.interact('computer');f.until(()=>f.motion.phase==='perform');assert.equal(f.camera.mode,'2D','computer retains its existing forced 2D behavior');
 f.motion.move(f.motion.position[0]-.1);f.until(()=>f.motion.phase==='idle');assert.equal(f.camera.mode,'2D','the consumed sleep mode cannot leak into later actions');
});

test('a queued action after waking restores 3D when standing before its own camera swap',()=>{
 const f=fixture('3D');f.motion.interact('bed');f.until(()=>f.motion.sleeping&&f.motion.phase==='perform');
 f.motion.interact('computer');f.until(()=>f.motion.phase==='walk');assert.equal(f.camera.mode,'3D');
 f.until(()=>f.motion.phase==='perform');assert.equal(f.camera.mode,'2D');
});

test('sleep invalidates a pending camera transition and its callback cannot overwrite restored 3D',async()=>{
 const f=fixture('3D');let apply,release,ready;const entered=new Promise(r=>ready=r);
 const pending=f.camera.cycle(f.motion,async()=>{},async callback=>{apply=callback;ready();await new Promise(r=>release=r);});
 await entered;f.motion.interact('bed');f.until(()=>f.motion.sleeping&&f.motion.phase==='perform');
 f.motion.wakeUp();f.until(()=>f.motion.phase==='idle');apply();release();
 assert.equal(await pending,false);assert.equal(f.camera.mode,'3D');
});

test('an in-flight first-person load cannot change a 2D sleep camera after waking',async()=>{
 const f=fixture('2D');let release;
 const pending=f.camera.cycle(f.motion,()=>new Promise(r=>release=r));
 f.motion.interact('bed');f.until(()=>f.motion.sleeping&&f.motion.phase==='perform');
 f.motion.wakeUp();f.until(()=>f.motion.phase==='idle');release();
 assert.equal(await pending,false);assert.equal(f.camera.mode,'2D');
 assert.equal(await f.camera.cycle(f.motion,async()=>{}),true,'normal switching remains available after cancellation');
 assert.equal(f.camera.mode,'3D');
});

test('a new character cannot inherit the sleeping character first-person restore',()=>{
 const f=fixture('3D');f.motion.interact('bed');f.until(()=>f.motion.sleeping&&f.motion.phase==='perform');
 f.camera.reset();
 const newcomer=new ApartmentMotion(config);newcomer.startSleeping();
 for(const event of newcomer.drainEvents())f.camera.onMotionEvent(event);newcomer.wakeUp();
 for(let i=0;i<100&&newcomer.phase!=='idle';i++){newcomer.tick(.05);for(const event of newcomer.drainEvents())f.camera.onMotionEvent(event);f.camera.onMotionState(newcomer);}
 assert.equal(newcomer.phase,'idle');assert.equal(f.camera.mode,'3D');
});

for(const outcome of ['resolve','reject'])test(`camera reset invalidates a pending load that will ${outcome} without unlocking a competing cycle`,async()=>{
 const camera=new CameraModes({initialMode:'2D'});let resolve,reject;
 const pending=camera.cycle({clip:'idle'},()=>new Promise((yes,no)=>{resolve=yes;reject=no;}));
 camera.reset();assert.equal(camera.loading,true);
 assert.equal(await camera.cycle({clip:'idle'},async()=>{}),false);
 if(outcome==='resolve')resolve();else reject(Error('old character load failed'));
 assert.equal(await pending,false);assert.equal(camera.mode,'3D');assert.equal(camera.loading,false);assert.equal(camera.error,null);
});

test('dining still forces 2D without remembering an unrelated first-person mode',()=>{
 const f=fixture('3D');f.motion.interact('dining');f.until(()=>f.motion.phase==='perform');assert.equal(f.camera.mode,'2D');
 f.until(()=>f.motion.phase==='idle');assert.equal(f.camera.mode,'2D');
});

for(const id of ['computer','dining'])test(`${id} supersedes a pending sleep restore if scene frames were skipped`,()=>{
 const motion=new ApartmentMotion(config),camera=new CameraModes();camera.mode='3D';
 const until=predicate=>{for(let i=0;i<3000&&!predicate();i++){motion.tick(.05);for(const event of motion.drainEvents())camera.onMotionEvent(event);}assert.ok(predicate());};
 motion.interact('bed');until(()=>motion.sleeping&&motion.phase==='perform');
 motion.interact(id);until(()=>motion.phase==='perform'&&motion.actionId===id);
 motion.move(motion.position[0]-.1);until(()=>motion.phase==='idle');camera.onMotionState(motion);
 assert.equal(camera.mode,'2D','later forced camera action wins over the skipped sleep restore');
});

test('the medium overview retains the doorway and whole actor from the living-room spawn',()=>{
 const state=new ApartmentMotion(config),pose=cameraPose('2D',state,1.63,{aspect:1280/900}),camera=new PerspectiveCamera(pose.fov,1280/900,.03,200);
 camera.position.fromArray(pose.position);camera.lookAt(new Vector3(...pose.target));camera.updateMatrixWorld();
 for(const point of [[-1,.8,-1],[5,1,-1],[3.4,0,.85],[3.4,1.75,.85]]){
  const p=new Vector3(...point).project(camera);assert.ok(Math.abs(p.x)<1&&Math.abs(p.y)<1,`overview must show ${point}: ${p.toArray()}`);
 }
});

test('overview follow keeps the actor on screen without following beyond apartment ends',()=>{
 const left=cameraPose('2D',{cameraX:-7.7,position:[-7.7,0,.85],config},1.63,{aspect:1280/900});
 const right=cameraPose('2D',{cameraX:8.1,position:[8.1,0,.85],config},1.63,{aspect:1280/900});
 assert.ok(left.target[0]>-6,'left end stops following before exposing the exterior side');
 assert.ok(right.target[0]<6,'right end stops following before exposing the exterior side');
 for(const [pose,x] of [[left,-7.7],[right,8.1]]){
  const c=new PerspectiveCamera(pose.fov,1280/900,.03,200);c.position.fromArray(pose.position);c.lookAt(new Vector3(...pose.target));c.updateMatrixWorld();
  assert.ok(Math.abs(new Vector3(x,1,.85).project(c).x)<.96,'edge actor remains in the usable view');
 }
});

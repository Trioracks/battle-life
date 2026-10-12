const DEG=Math.PI/180;
// Camera changes may hide the authored front wall/ceiling, never replace the
// furnished room or reset live doors, blankets, switches and interaction targets.
export function createSharedSceneVisibility({staticScene,liveScene,courtyard}){
 const shell=[],proxies=[],bulbs=[];
 staticScene.traverse(o=>{if(o.name.startsWith('static-cutaway-shell-'))shell.push(o);});
 liveScene.traverse(o=>{if(o.name.startsWith('depth-'))proxies.push(o);if(/^lamp-(living|kitchen)-bulb/.test(o.name))bulbs.push(o);});
 return ({mode,computerActive=false})=>{
  staticScene.visible=liveScene.visible=courtyard.visible=true;
  for(const object of shell)object.visible=mode==='3D'&&!computerActive;
  for(const object of proxies)object.visible=false;
  for(const object of bulbs)object.visible=true;
 };
}
export class CameraPointer{
 constructor(){this.active=false;this.x=0;this.y=0;}
 start(event,firstPerson){if(event.button!==2||!firstPerson)return false;this.active=true;this.x=event.clientX;this.y=event.clientY;return true;}
 canPick(event){return event.button===0&&!this.active;}
 move(event){if(!this.active)return null;const delta=[event.clientX-this.x,event.clientY-this.y];this.x=event.clientX;this.y=event.clientY;return delta;}
 stop(){this.active=false;}
}
export function cameraAllowsFirstPerson(state){return !['sleep','seated','eat'].includes(state.clip)&&!(/^(fade|black|return-out|return-in|transfer|entry-)/.test(state.phase??''));}
export function cameraPose(mode,state,eyeHeight,look={yaw:0,pitch:0}){
 if(mode==='3D')return {position:[state.position[0],state.position[1]+eyeHeight,state.position[2]],yaw:look.yaw,pitch:look.pitch,fov:60,near:.03};
 const yaw=0,pitch=8,distance=8;
 // Intermediate framing between the original close view and the wide overview.
 // Follow and edge limits still operate on the exact same furnished scene.
 const height=5.025,targetY=1.15,fov=2*Math.atan(height/(2*distance/Math.cos(pitch*DEG)))/DEG;
 const aspect=look.aspect??1280/900,z=state.position?.[2]??.85;
 const depth=distance/Math.cos(pitch*DEG)-z*Math.cos(pitch*DEG)-(1-targetY)*Math.sin(pitch*DEG);
 const halfWidth=depth*Math.tan(fov*DEG/2)*aspect;
 const rooms=state.config?.layout?.rooms,left=rooms?.kitchen.x[0]??-8,right=rooms?.living.x[1]??8.5;
 const midpoint=(left+right)/2,actorX=state.cameraX??state.position?.[0]??midpoint;
 const follow=Math.max(actorX-halfWidth*.4,Math.min(actorX+halfWidth*.4,midpoint));
 const inset=Math.min(halfWidth*.95,(right-left)/2);
 const centerX=Math.max(left+inset,Math.min(right-inset,follow));
 return {position:[centerX+Math.sin(yaw*DEG)*distance,targetY+distance*Math.tan(pitch*DEG),Math.cos(yaw*DEG)*distance],target:[centerX,targetY,0],yaw,pitch,fov,near:.03};
}
export function pickVisible(targets,blockers,floor){
 const wall=blockers[0]?.distance??Infinity,hit=targets[0];
 if(hit&&hit.distance<=wall+.025)return {id:hit.id};
 if(floor&&floor.distance<=wall+.025)return {x:floor.x};return {};
}
export class CameraModes{
 constructor({initialMode='3D'}={}){this.mode=initialMode==='2D'?'2D':'3D';this.yaw=0;this.pitch=0;this.loading=false;this.error=null;this.loaded=new Set(['2D']);this.revision=0;this.sleepCamera=null;}
 reset({initialMode='3D'}={}){this.mode=initialMode==='2D'?'2D':'3D';this.yaw=0;this.pitch=0;this.sleepCamera=null;this.error=null;this.revision++;}
 look(dx,dy){this.yaw-=dx*.004;this.pitch=Math.max(-70*DEG,Math.min(70*DEG,this.pitch-dy*.004));}
 onMotionEvent(event){
  if(event.id==='bed'&&(event.type==='swap'||event.type==='started')){
   if(this.sleepCamera===null)this.sleepCamera=this.mode;
   this.mode='2D';this.revision++;
  }else if(event.type==='swap'&&['computer','dining'].includes(event.id)){this.sleepCamera=null;this.mode='2D';this.revision++;}
 }
 onMotionState(state){
  // completed is emitted as waking begins. Restore after the return fade has
  // finished and the actor is standing, including a queued walk to another action.
  if(this.sleepCamera===null||state.actionId==='bed'||!cameraAllowsFirstPerson(state))return;
  this.mode=this.sleepCamera;this.sleepCamera=null;this.revision++;
 }
 async cycle(state,load,transition=async apply=>apply()){
  if(this.loading)return false;
  if(!['2D','3D'].includes(this.mode))this.mode='2D';
  const next=this.mode==='2D'?'3D':'2D';
  if(next==='3D'&&!cameraAllowsFirstPerson(state))return false;
  this.loading=true;this.error=null;const revision=this.revision;
  try{if(!this.loaded.has(next)){await load(next);this.loaded.add(next);}if(revision!==this.revision||(next==='3D'&&!cameraAllowsFirstPerson(state)))return false;
   await transition(()=>{if(revision===this.revision)this.mode=next;});return revision===this.revision;
  }catch(error){if(revision===this.revision)this.error=error;return false;}finally{this.loading=false;}
 }
}

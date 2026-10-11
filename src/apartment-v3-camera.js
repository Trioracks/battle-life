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
 const yaw=0,pitch=12,distance=3.5;
 const centerX=state.cameraX-Math.tan(yaw*DEG)*(state.position?.[2]??.85);
 // Keep room/hero coverage vertically fixed; narrow screens crop horizontally
 // and follow the actor. The wall and floor cover the cutaway frame edges.
 const height=3.58,targetY=.6,fov=2*Math.atan(height/(2*distance/Math.cos(pitch*DEG)))/DEG;
 return {position:[centerX+Math.sin(yaw*DEG)*distance,targetY+distance*Math.tan(pitch*DEG),Math.cos(yaw*DEG)*distance],target:[centerX,targetY,0],yaw,pitch,fov,near:.03};
}
export function pickVisible(targets,blockers,floor){
 const wall=blockers[0]?.distance??Infinity,hit=targets[0];
 if(hit&&hit.distance<=wall+.025)return {id:hit.id};
 if(floor&&floor.distance<=wall+.025)return {x:floor.x};return {};
}
export class CameraModes{
 constructor(){this.mode='2D';this.yaw=0;this.pitch=0;this.loading=false;this.error=null;this.loaded=new Set(['2D']);this.revision=0;}
 look(dx,dy){this.yaw-=dx*.004;this.pitch=Math.max(-70*DEG,Math.min(70*DEG,this.pitch-dy*.004));}
 onMotionEvent(event){if(event.type==='swap'&&['bed','computer','dining'].includes(event.id)){this.mode='2D';this.revision++;}}
 async cycle(state,load,transition=async apply=>apply()){
  if(this.loading)return false;
  if(!['2D','3D'].includes(this.mode))this.mode='2D';
  const next=this.mode==='2D'?'3D':'2D';
  if(next==='3D'&&!cameraAllowsFirstPerson(state))return false;
  this.loading=true;this.error=null;const revision=this.revision;
  try{if(!this.loaded.has(next)){await load(next);this.loaded.add(next);}if(revision!==this.revision||(next==='3D'&&!cameraAllowsFirstPerson(state)))return false;
   await transition(()=>{if(revision===this.revision)this.mode=next;});return revision===this.revision;
  }catch(error){this.error=error;return false;}finally{this.loading=false;}
 }
}

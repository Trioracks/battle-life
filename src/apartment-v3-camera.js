const DEG=Math.PI/180;
export class CameraPointer{
 constructor(){this.active=false;this.x=0;this.y=0;}
 start(event,firstPerson){if(event.button!==2||!firstPerson)return false;this.active=true;this.x=event.clientX;this.y=event.clientY;return true;}
 canPick(event){return event.button===0&&!this.active;}
 move(event){if(!this.active)return null;const delta=[event.clientX-this.x,event.clientY-this.y];this.x=event.clientX;this.y=event.clientY;return delta;}
 stop(){this.active=false;}
}
export function cameraAllowsFirstPerson(state){return !['sleep','seated'].includes(state.clip)&&!(/^(fade|black|return-out|return-in|transfer|entry-)/.test(state.phase??''));}
export function cameraPose(mode,state,eyeHeight,look={yaw:0,pitch:0}){
 if(mode==='3D')return {position:[state.position[0],state.position[1]+eyeHeight,state.position[2]],yaw:look.yaw,pitch:look.pitch,fov:60,near:.03};
 const yaw=mode==='2.5D'?8:0,pitch=8,distance=12;
 const centerX=state.cameraX-Math.tan(yaw*DEG)*(state.position?.[2]??.85);
 return {position:[centerX+Math.sin(yaw*DEG)*distance,1.35+12*Math.tan(pitch*DEG),Math.cos(yaw*DEG)*distance],target:[centerX,1.35,0],yaw,pitch};
}
export function pickVisible(targets,blockers,floor){
 const wall=blockers[0]?.distance??Infinity,hit=targets[0];
 if(hit&&hit.distance<=wall+.025)return {id:hit.id};
 if(floor&&floor.distance<=wall+.025)return {x:floor.x};return {};
}
export class CameraModes{
 constructor(){this.mode='2D';this.yaw=0;this.pitch=0;this.loading=false;this.error=null;this.loaded=new Set(['2D']);this.revision=0;}
 look(dx,dy){this.yaw-=dx*.004;this.pitch=Math.max(-70*DEG,Math.min(70*DEG,this.pitch-dy*.004));}
 onMotionEvent(event){if(event.type==='swap'&&['bed','computer'].includes(event.id)){this.mode='2D';this.revision++;}}
 async cycle(state,load,transition=async apply=>apply()){
  if(this.loading)return false;const next={'2D':'2.5D','2.5D':'3D','3D':'2D'}[this.mode];
  if(next==='3D'&&!cameraAllowsFirstPerson(state))return false;
  this.loading=true;this.error=null;const revision=this.revision;
  try{if(!this.loaded.has(next)){await load(next);this.loaded.add(next);}if(revision!==this.revision||(next==='3D'&&!cameraAllowsFirstPerson(state)))return false;
   await transition(()=>{if(revision===this.revision)this.mode=next;});return revision===this.revision;
  }catch(error){this.error=error;return false;}finally{this.loading=false;}
 }
}

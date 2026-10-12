import {PcTransition} from './virtual-pc-transition.js?rev=38';
export const pcNeedsSceneFrame=(snapshot,mode)=>mode!=='pc'||snapshot.overlay<1;
export function beginPcCutscene(motion){
 if(motion.busy||!motion.config.actions.computer)return false;
 return motion.interact('computer');
}
export function pcActorVisible(motion,computerActive,workActor=false){
 if(workActor)return true;
 return !computerActive&&!(motion.actionId==='computer'&&['black','fade-in','perform','return-out'].includes(motion.phase));
}
export function preparePcWorkPose(motion){
 if(motion.actionId!=='computer'||motion.phase!=='perform')return false;
 motion.yaw=motion.targetYaw=motion.config.actions.computer.yaw;return true;
}
export function moveInRoom(motion,lifecycle,x){
 if(!motion.move(x))return false;
 if(lifecycle.pending&&!lifecycle.entering)lifecycle.reset();
 return true;
}
export class PcLifecycle{
 constructor({view,getState,setPower,sounds,onDesktop=()=>{},onRoom=()=>{},onError=()=>{}}){Object.assign(this,{view,getState,setPower,sounds,onDesktop,onRoom,onError});this.transition=new PcTransition();this.generation=0;this.pending=null;this.savedLook=null;this.entering=false;}
 get snapshot(){const snapshot=this.transition.snapshot;return this.pending?{...snapshot,phase:'preparing',locked:true}:snapshot;}
 prepare(){
  if(this.pending||this.snapshot.phase!=='room')return false;
  this.savedLook={mode:this.view.modes.mode,yaw:this.view.modes.yaw,pitch:this.view.modes.pitch};
  try{this.pending=Promise.resolve(this.view.prepareComputerView()).then(()=>({ok:true}),error=>({ok:false,error}));}catch(error){this.pending=Promise.resolve({ok:false,error});}
  return true;
 }
 async seated(){
  if(this.entering||!this.pending)return false;this.entering=true;const generation=this.generation;
  const ready=await this.pending;if(generation!==this.generation)return false;
  this.pending=null;this.entering=false;
  if(!ready.ok){this.onError(ready.error);this.onRoom();return false;}
  try{this.view.beginComputerView();}catch(error){this.onError(error);this.onRoom();return false;}
  this.transition.enter({alreadyOn:this.getState().power==='on'});this.consume();return true;
 }
 leave(){const result=this.transition.leave();this.consume();return result;}
 work(){const result=this.transition.work();this.consume();return result;}
 react(){const result=this.transition.react();if(result)this.reactionLook={mode:this.view.modes.mode,yaw:this.view.modes.yaw,pitch:this.view.modes.pitch};this.consume();return result;}
 finishReaction(){const result=this.transition.finishReaction();this.consume();return result;}
 finishWork(options){const result=this.transition.finishWork(options);this.consume();return result;}
 shutdown(){const result=this.transition.shutdown();this.consume();return result;}
 tick(dt,{paused=false,hidden=false}={}){if(!paused&&!hidden)this.transition.tick(dt);this.consume();}
 consume(){for(const event of this.transition.drainEvents()){
  if(event.type==='power-on')this.setPower('on');else if(event.type==='power-off')this.setPower('off');
  else if(['bios','startup','shutdown'].includes(event.type))Promise.resolve(this.sounds?.play(event.type)).catch(()=>{});
  else if(event.type==='desktop-ready')this.onDesktop();
  else if(event.type==='work-scene'){this.view.endComputerView();this.view.modes.mode='2D';this.view.modes.revision++;}
  else if(event.type==='work-camera')this.view.beginComputerView();
  else if(event.type==='reaction-scene'){this.view.endComputerView();this.view.modes.mode='2D';this.view.modes.revision++;}
  else if(event.type==='reaction-camera'){if(this.reactionLook)Object.assign(this.view.modes,this.reactionLook);this.view.modes.revision++;this.reactionLook=null;this.view.beginComputerView();}
  else if(event.type==='room-ready'){this.view.endComputerView();this.onRoom();}
 }}
 restore(phase){if(phase!=='return-in'||!this.savedLook)return;Object.assign(this.view.modes,this.savedLook);this.view.modes.revision++;this.savedLook=null;}
 reset(){this.generation++;this.pending=null;this.entering=false;this.savedLook=null;this.reactionLook=null;this.transition.cancel();this.view.endComputerView();this.sounds?.stop?.();}
}

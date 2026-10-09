import {PcTransition} from './virtual-pc-transition.js?rev=18';
export const pcNeedsSceneFrame=(snapshot,mode)=>mode!=='pc'||snapshot.overlay<1;
export class PcLifecycle{
 constructor({view,getState,setPower,sounds,onDesktop=()=>{},onRoom=()=>{},onError=()=>{}}){Object.assign(this,{view,getState,setPower,sounds,onDesktop,onRoom,onError});this.transition=new PcTransition();this.generation=0;this.pending=null;this.savedLook=null;this.entering=false;}
 get snapshot(){return this.transition.snapshot;}
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
 shutdown(){const result=this.transition.shutdown();this.consume();return result;}
 tick(dt,{paused=false,hidden=false}={}){if(!paused&&!hidden)this.transition.tick(dt);this.consume();}
 consume(){for(const event of this.transition.drainEvents()){
  if(event.type==='power-on')this.setPower('on');else if(event.type==='power-off')this.setPower('off');
  else if(['bios','startup','shutdown'].includes(event.type))Promise.resolve(this.sounds?.play(event.type)).catch(()=>{});
  else if(event.type==='desktop-ready')this.onDesktop();
  else if(event.type==='room-ready'){this.view.endComputerView();this.onRoom();}
 }}
 restore(phase){if(phase!=='return-in'||!this.savedLook)return;Object.assign(this.view.modes,this.savedLook);this.view.modes.revision++;this.savedLook=null;}
 reset(){this.generation++;this.pending=null;this.entering=false;this.savedLook=null;this.transition.cancel();this.view.endComputerView();this.sounds?.stop?.();}
}

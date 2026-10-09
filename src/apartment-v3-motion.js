const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const mix=(a,b,t)=>a+(b-a)*t;

/** Scene coordinates and action anchors all originate in the Blender export. */
export class ApartmentMotion {
  constructor(config) {
    this.config=config;this.position=[...config.spawn];this.yaw=0;this.targetYaw=0;
    this.phase='idle';this.clip='idle';this.actionId=null;this.targetX=this.position[0];
    this.fade=0;this.phaseTime=0;this.walkDistance=0;this.doorOpen=0;this.events=[];
    this.doorAuthorized=false;this.sleeping=false;this.entryOpen=0;this.outside=false;
  }
  get cameraX(){return this.position[0];}
  get action(){return this.config.actions[this.actionId]??null;}
  get busy(){return !['idle','walk','perform'].includes(this.phase)||(this.phase==='perform'&&this.actionId==='entry');}
  get inDoorSweep(){
    const [min,max]=this.config.doorSweep??[-.4,1.35],offset=this.position[0]-this.config.doorX;
    return offset>=min&&offset<=max;
  }
  setPhase(phase){this.phase=phase;this.phaseTime=0;}
  startWalk(x,id=null){
    this.actionId=id;this.targetX=clamp(x,...this.config.bounds);this.setPhase('walk');
    const from=this.position[0]-this.config.doorX,to=this.targetX-this.config.doorX;
    if(from*to<0||(from===0&&to!==0))this.doorAuthorized=true;
    else if(!this.inDoorSweep||this.doorOpen===0)this.doorAuthorized=false;
    if(!this.doorAuthorized&&from!==0&&Math.abs(to)<.3){
      this.targetX=this.config.doorX+Math.sign(from)*.3;
    }
  }
  move(x){
    if(!Number.isFinite(x)||this.busy)return false;
    if(this.phase==='perform'){
      this.pending={x,id:null};this.leaveAction();
    }else this.startWalk(x);
    return true;
  }
  interact(id){
    if(this.busy)return false;
    const a=this.config.actions[id];if(!a)return false;
    if(a.crossRoom)return this.move(this.position[0]>this.config.doorX ? -1.5 : 1.5);
    if(this.phase==='perform'){
      this.pending={x:a.approach[0],id};this.leaveAction();
    }else this.startWalk(a.approach[0],id);
    return true;
  }
  faceCamera(){if(this.phase!=='idle')return;this.targetYaw=0;this.setPhase('face');}
  startSleeping(){
    const bed=this.config.actions.bed;if(!bed)return false;
    this.actionId='bed';this.position=[...bed.pose];this.yaw=this.targetYaw=bed.yaw;
    this.targetX=this.position[0];this.fade=0;this.pending=null;this.sleeping=true;
    this.doorAuthorized=false;this.doorOpen=0;this.events=[];this.startPerform();
    return true;
  }
  wakeUp(){
    if(!this.sleeping||this.phase!=='perform')return false;
    this.leaveAction();return true;
  }
  returnHome(){
    if(this.phase!=='outside')return false;
    this.outside=false;this.entryOpen=1;this.fade=1;this.clip='idle';this.pending=null;
    const to=this.action.approach;
    this.yaw=this.targetYaw=Math.atan2(to[0]-this.position[0],to[2]-this.position[2]);
    this.from=[...this.position];this.setPhase('entry-return-in');
    return true;
  }
  leaveAction(){
    if(this.sleeping)this.events.push({type:'completed',id:'bed'});
    this.sleeping=false;
    this.from=[...this.position];this.setPhase(this.action?.fade?'return-out':'return-turn');
    const to=this.action?.approach;
    if(to)this.targetYaw=Math.atan2(to[0]-this.position[0],to[2]-this.position[2]);
    if(!this.action?.fade)this.clip='idle';
  }
  settleReturn(){
    this.position=[...(this.action?.approach??[this.position[0],0,this.config.spawn[2]])];
    this.actionId=null;this.clip='idle';
  }
  finishReturn(){
    this.setPhase('idle');if(this.pending){const p=this.pending;this.pending=null;this.startWalk(p.x,p.id);}
  }
  startPerform(){
    if(this.actionId==='bed'&&this.action.clockDriven)this.sleeping=true;
    this.interactionTriggered=false;
    this.clip=this.action.clip;this.setPhase('perform');this.events.push({type:'started',id:this.actionId});
  }
  drainEvents(){return this.events.splice(0);}
  tick(rawDelta,holdAction=false){
    const dt=clamp(Number(rawDelta)||0,0,.05);this.phaseTime+=dt;
    const crossing=(this.position[0]-this.config.doorX)*(this.targetX-this.config.doorX)<0;
    const distanceToDoor=Math.abs(this.position[0]-this.config.doorX);
    // Keep an authorized passage open until the actor clears the door sweep.
    if(!crossing&&!this.inDoorSweep)this.doorAuthorized=false;
    const wantDoor=this.doorAuthorized&&((crossing&&distanceToDoor<1.35)||this.inDoorSweep);
    this.doorOpen=mix(this.doorOpen,wantDoor?1:0,1-Math.exp(-dt*7));
    if(this.phase==='walk'){
      const dx=this.targetX-this.position[0];
      const step=Math.sign(dx)*Math.min(Math.abs(dx),dt*this.config.speed);
      const nextX=this.position[0]+step;
      const entersDoor=distanceToDoor<.3||Math.abs(nextX-this.config.doorX)<.3;
      const waitForDoor=this.doorAuthorized&&entersDoor&&this.doorOpen<.88;
      if(Math.abs(dx)<.015&&!waitForDoor){
        this.position[0]=this.targetX;this.clip='idle';
        if(this.action){
          const to=this.action.pose;
          this.targetYaw=this.action.fade?this.action.yaw:Math.atan2(to[0]-this.position[0],to[2]-this.position[2]);
          this.setPhase('turn');
        }
        else this.setPhase('idle');
      }else{
        this.targetYaw=Math.sign(dx)*Math.PI/2;
        const diff=angleDelta(this.yaw,this.targetYaw);this.yaw+=diff*(1-Math.exp(-dt*16));
        if(Math.abs(diff)<.07){
          this.yaw=this.targetYaw;this.clip='walk';
          if(!waitForDoor){
            this.position[0]=nextX;this.walkDistance+=Math.abs(step);
          }
        }else this.clip='idle';
      }
    }else if(this.phase==='idle'&&this.phaseTime>=10){
      this.targetYaw=Math.sign(this.yaw)*Math.min(.3,Math.abs(this.yaw));
      this.yaw+=angleDelta(this.yaw,this.targetYaw)*(1-Math.exp(-dt*2.5));
    }else if(this.phase==='face'){
      this.yaw+=angleDelta(this.yaw,0)*(1-Math.exp(-dt*12));
      if(this.phaseTime>=.45){this.yaw=0;this.setPhase('idle');}
    }else if(this.phase==='turn'){
      this.yaw+=angleDelta(this.yaw,this.targetYaw)*(1-Math.exp(-dt*16));
      if(this.phaseTime>=.35){
        this.yaw=this.targetYaw;this.from=[...this.position];
        this.setPhase(this.action.fade?'fade-out':'approach-depth');
      }
    }else if(this.phase==='fade-out'){
      this.fade=clamp(this.phaseTime/.25,0,1);
      if(this.fade===1){this.position=[...this.action.pose];this.clip=this.action.clip;this.setPhase('black');}
    }else if(this.phase==='black'){
      if(this.phaseTime>.1){this.events.push({type:'swap',id:this.actionId});this.setPhase('fade-in');}
    }else if(this.phase==='fade-in'){
      this.fade=1-clamp(this.phaseTime/.3,0,1);if(this.fade===0)this.startPerform();
    }else if(this.phase==='approach-depth'){
      const duration=Math.hypot(...this.action.pose.map((v,i)=>v-this.from[i]))/this.config.speed;
      const t=clamp(this.phaseTime/Math.max(.3,duration),0,1);
      const previous=[...this.position];
      this.position=this.from.map((v,i)=>mix(v,this.action.pose[i],t*t*(3-2*t)));
      this.walkDistance+=Math.hypot(...this.position.map((v,i)=>v-previous[i]));
      this.clip='walk';if(t===1){
        this.position=[...this.action.pose];this.targetYaw=this.action.yaw;
        if(Math.abs(angleDelta(this.yaw,this.targetYaw))>.02){this.clip='idle';this.setPhase('align-object');}
        else this.startPerform();
      }
    }else if(this.phase==='align-object'){
      this.yaw+=angleDelta(this.yaw,this.targetYaw)*(1-Math.exp(-dt*16));
      if(this.phaseTime>=.3){this.yaw=this.targetYaw;this.startPerform();}
    }else if(this.phase==='perform'){
      if(this.action.lightRoom&&!this.interactionTriggered&&this.phaseTime>=(this.action.contactTime??.32)){
        this.interactionTriggered=true;this.events.push({type:'interacted',id:this.actionId});
      }
      if(this.actionId==='entry'){
        // The hand reaches the leaf before the outward push begins.
        this.entryOpen=clamp((this.phaseTime-.25)/.95,0,1);
        if(!holdAction&&this.phaseTime>=this.action.duration&&this.entryOpen===1){
          this.from=[...this.position];this.clip='walk';this.setPhase('entry-leave');
        }
      }else if(!holdAction&&!this.sleeping&&this.phaseTime>=this.action.duration){
        this.events.push({type:'completed',id:this.actionId});this.leaveAction();
      }
    }else if(this.phase==='entry-leave'){
      const to=this.config.entryExit?.position??[this.from[0],this.from[1],Math.min(-2.1,this.action.pose[2]-.85)];
      const duration=Math.hypot(...to.map((v,i)=>v-this.from[i]))/this.config.speed;
      const t=clamp(this.phaseTime/Math.max(.01,duration),0,1),before=[...this.position];
      this.yaw=this.targetYaw=Math.atan2(to[0]-this.from[0],to[2]-this.from[2]);
      this.position=this.from.map((v,i)=>mix(v,to[i],t));this.walkDistance+=Math.hypot(...this.position.map((v,i)=>v-before[i]));
      if(t===1){this.clip='idle';this.setPhase('entry-fade-out');}
    }else if(this.phase==='entry-fade-out'){
      this.fade=clamp(this.phaseTime/.3,0,1);
      if(this.fade===1){
        this.outside=true;this.entryOpen=0;this.setPhase('outside');
        this.events.push({type:'exited',id:'entry'});
      }
    }else if(this.phase==='entry-return-in'){
      this.fade=1-clamp(this.phaseTime/.3,0,1);
      if(this.fade===0){this.clip='walk';this.setPhase('entry-return-depth');}
    }else if(this.phase==='entry-return-depth'){
      const to=this.action.approach,duration=Math.hypot(...to.map((v,i)=>v-this.from[i]))/this.config.speed;
      const t=clamp(this.phaseTime/Math.max(.3,duration),0,1),previous=[...this.position];
      this.position=this.from.map((v,i)=>mix(v,to[i],t));
      this.walkDistance+=Math.hypot(...this.position.map((v,i)=>v-previous[i]));
      if(t===1){this.clip='idle';this.setPhase('entry-close');}
    }else if(this.phase==='entry-close'){
      this.entryOpen=1-clamp(this.phaseTime/.45,0,1);
      if(this.entryOpen===0){this.settleReturn();this.finishReturn();}
    }else if(this.phase==='return-out'){
      this.fade=clamp(this.phaseTime/.25,0,1);
      if(this.fade===1){this.settleReturn();this.setPhase('return-in');}
    }else if(this.phase==='return-in'){
      this.fade=1-clamp(this.phaseTime/.3,0,1);if(this.fade===0)this.finishReturn();
    }else if(this.phase==='return-turn'){
      this.yaw+=angleDelta(this.yaw,this.targetYaw)*(1-Math.exp(-dt*16));
      if(this.phaseTime>=.4){this.yaw=this.targetYaw;this.setPhase('return-depth');}
    }else if(this.phase==='return-depth'){
      const to=this.action.approach,duration=Math.hypot(...to.map((v,i)=>v-this.from[i]))/this.config.speed;
      const t=clamp(this.phaseTime/Math.max(.3,duration),0,1),previous=[...this.position];
      this.position=this.from.map((v,i)=>mix(v,to[i],t));
      this.clip='walk';this.walkDistance+=Math.hypot(...this.position.map((v,i)=>v-previous[i]));
      if(t===1){this.settleReturn();this.finishReturn();}
    }
    return this;
  }
}

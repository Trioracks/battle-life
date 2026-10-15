/** Real mixer, shared by every pose. Distance drives phase, time drives fades. */
export class ApartmentAnimation{
  constructor(mixer,clips,stride){
    this.mixer=mixer;this.stride=stride;
    this.actions=new Map(clips.map(c=>[c.name,mixer.clipAction(c)]));
    this.current=null;this.active=null;
    this.workTime=0;this.workBones=[];
    mixer.getRoot().traverse(node=>{
      if(!node.isBone)return;
      const name=node.name.replace(/[._]/g,'');
      const kind=name.startsWith('upperarm')?'upper':name.startsWith('forearm')?'arm':name.startsWith('hand')?'hand':name==='chest'?'chest':name==='head'?'head':null;
      if(kind)this.workBones.push({node,kind,phase:name.endsWith('R')?1.7:0,base:null});
    });
  }
  update(state,dt,paused=false){
    // Undo only our additive pose, before the mixer reapplies its own animation.
    for(const bone of this.workBones)if(bone.base){bone.node.quaternion.copy(bone.base);bone.base=null;}
    if(state.clip!==this.current){
      const next=this.actions.get(state.clip);if(!next)throw Error('Missing clip: '+state.clip);
      const instant=state.fade>=.999;
      if(instant)this.mixer.stopAllAction();else this.active?.fadeOut(.16);
      next.reset().setEffectiveWeight(1).play();if(!instant)next.fadeIn(.16);
      if(state.clip==='open-door'||state.clip==='switch'){next.repetitions=1;next.clampWhenFinished=true;}
      this.active=next;this.current=state.clip;
    }
    const working=state.working&&state.clip==='seated';
    const rapping=working&&state.workPerformance==='rapping';
    // A vocal performance holds the authored seated contact pose: no typing loop.
    if(rapping)this.active.time=0;
    this.mixer.update(paused||rapping?0:dt*(working?3:1));
    if(this.current==='walk'&&!paused){
      const duration=this.active.getClip().duration;
      this.active.time=(state.walkDistance/this.stride*duration)%duration;
      this.mixer.update(0);
    }
    if(working){
      if(rapping&&Number.isFinite(state.workElapsedSeconds))this.workTime=state.workElapsedSeconds;
      else if(!paused)this.workTime+=dt;
      for(const bone of this.workBones){
        bone.base=bone.node.quaternion.clone();
        if(rapping){
          const gesture=state.reducedMotion?0:Math.sin(this.workTime*Math.PI*3+bone.phase);
          if(bone.kind==='chest'||bone.kind==='head'){
            // The exported rig faces local +Z; desk yaw maps this toward the mic.
            bone.node.rotateY(bone.kind==='chest'?-.5:-.12);
            if(bone.kind==='head')bone.node.rotateX(.035+gesture*.01);
          }else{
            // Relax both arms by the lap, rather than holding the keyboard reach.
            const angle=bone.kind==='upper'?3.3:bone.kind==='arm'?-1.4:-.2;
            bone.node.quaternion.set(Math.sin(angle/2),0,0,Math.cos(angle/2));
          }
        }else if(bone.kind!=='head'&&bone.kind!=='upper'){
          const tap=Math.sin(this.workTime*32+bone.phase);
          // Small taps preserve palm contact; the authored wrist trajectory owns reach.
          bone.node.rotateX(bone.kind==='chest'?0:tap*(bone.kind==='arm'?.006:.018));
        }
      }
    }else this.workTime=0;
  }
}

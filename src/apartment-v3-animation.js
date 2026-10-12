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
      const kind=name.startsWith('forearm')?'arm':name.startsWith('hand')?'hand':name==='chest'?'chest':name==='head'?'head':null;
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
    this.mixer.update(paused?0:dt*(working&&!rapping?3:1));
    if(this.current==='walk'&&!paused){
      const duration=this.active.getClip().duration;
      this.active.time=(state.walkDistance/this.stride*duration)%duration;
      this.mixer.update(0);
    }
    if(working){
      if(!paused)this.workTime+=dt;
      for(const bone of this.workBones){
        bone.base=bone.node.quaternion.clone();
        if(rapping){
          const blend=Math.min(1,this.workTime/.25),gesture=Math.sin(this.workTime*5.4+bone.phase);
          if(bone.kind==='chest'||bone.kind==='head'){
            bone.node.rotateY(-blend*(bone.kind==='chest'?.3:.22));
            bone.node.rotateX(blend*(bone.kind==='chest'?.1:.04+gesture*.025));
          }else{
            bone.node.rotateX(blend*(bone.kind==='arm'?-.24+gesture*.18:gesture*.09));
            bone.node.rotateZ(blend*Math.sin(this.workTime*3.1+bone.phase)*.09);
          }
        }else if(bone.kind!=='head'){
          const tap=Math.sin(this.workTime*32+bone.phase);
          bone.node.rotateX(bone.kind==='chest'?Math.sin(this.workTime*7)*.014:tap*(bone.kind==='arm'?.10:.13));
        }
      }
    }else this.workTime=0;
  }
}

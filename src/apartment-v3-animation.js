/** Real mixer, shared by every pose. Distance drives phase, time drives fades. */
export class ApartmentAnimation{
  constructor(mixer,clips,stride){
    this.mixer=mixer;this.stride=stride;
    this.actions=new Map(clips.map(c=>[c.name,mixer.clipAction(c)]));
    this.current=null;this.active=null;
  }
  update(state,dt,paused=false){
    if(state.clip!==this.current){
      const next=this.actions.get(state.clip);if(!next)throw Error('Missing clip: '+state.clip);
      const instant=state.fade>=.999;
      if(instant)this.mixer.stopAllAction();else this.active?.fadeOut(.16);
      next.reset().setEffectiveWeight(1).play();if(!instant)next.fadeIn(.16);
      if(state.clip==='open-door'||state.clip==='switch'){next.repetitions=1;next.clampWhenFinished=true;}
      this.active=next;this.current=state.clip;
    }
    this.mixer.update(paused?0:dt);
    if(this.current==='walk'&&!paused){
      const duration=this.active.getClip().duration;
      this.active.time=(state.walkDistance/this.stride*duration)%duration;
      this.mixer.update(0);
    }
  }
}

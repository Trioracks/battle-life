const DURATION=Object.freeze({'power-on':1.2,'zoom-in':2.4,loading:6,welcome:1.4,shutdown:2.5,'fade-out':.5,'zoom-out':2.4,'work-out':2.4,'work-reveal':.35,'work-cover':.35,'work-in':2.4});
const clamp=value=>Math.max(0,Math.min(1,value));

// Owns presentation time only. Durable power and the game clock belong to the host.
export class PcTransition {
  constructor(){this.cancel();}
  get snapshot(){
    const phase=this.phase,duration=DURATION[phase];
    const progress=duration?clamp(this.elapsed/duration):0;
    const zoomingIn=['zoom-in','work-in'].includes(phase),zoomingOut=['zoom-out','work-out'].includes(phase),workActor=['work-reveal','working','work-cover'].includes(phase);
    const zoom=zoomingIn?progress:zoomingOut?1-progress:['room','power-on'].includes(phase)||workActor?0:1;
    const overlay=zoomingIn?clamp((this.elapsed-2.25)/.15):zoomingOut?1-clamp(this.elapsed/.15):['room','power-on'].includes(phase)||workActor?0:1;
    const blackout=phase==='work-out'?clamp((progress-.88)/.12):phase==='work-reveal'?1-progress:phase==='work-cover'?progress:phase==='work-in'?1-clamp(progress/.12):0;
    return {phase,progress,zoom,overlay,blackout,workActor,locked:!['room','desktop'].includes(phase),coldStart:this.coldStart};
  }
  enter({alreadyOn}={}){
    if(this.phase!=='room')return false;
    this.coldStart=!alreadyOn;
    this.setPhase(this.coldStart?'power-on':'zoom-in');
    if(this.coldStart)this.events.push({type:'power-on'},{type:'bios'});
    return true;
  }
  leave(){
    if(this.phase!=='desktop')return false;
    this.setPhase('zoom-out');return true;
  }
  work(){if(this.phase!=='desktop')return false;this.setPhase('work-out');return true;}
  finishWork({blocked=false}={}){if(this.phase!=='working')return false;this.workBlocked=blocked;this.setPhase('work-cover');return true;}
  shutdown(){
    if(this.phase!=='desktop')return false;
    this.setPhase('shutdown');this.events.push({type:'power-off'},{type:'shutdown'});return true;
  }
  tick(dtSeconds){
    if(!Number.isFinite(dtSeconds)||dtSeconds<=0)return;
    let remaining=dtSeconds;
    while(DURATION[this.phase]){
      const left=DURATION[this.phase]-this.elapsed;
      if(remaining<left-1e-9){this.elapsed+=remaining;return;}
      remaining=Math.max(0,remaining-left);
      const next={'power-on':'zoom-in','zoom-in':this.coldStart?'loading':'desktop',loading:'welcome',welcome:'desktop',shutdown:'fade-out','fade-out':'zoom-out','zoom-out':'room','work-out':'work-reveal','work-reveal':'working','work-cover':this.workBlocked?'room':'work-in','work-in':'desktop'}[this.phase];
      this.setPhase(next);
      if(next==='work-reveal')this.events.push({type:'work-scene'});
      if(next==='work-in')this.events.push({type:'work-camera'});
      if(next==='welcome')this.events.push({type:'startup'});
      if(next==='desktop')this.events.push({type:'desktop-ready'});
      if(next==='room'){this.coldStart=false;this.events.push({type:'room-ready'});}
      if(remaining===0)return;
    }
  }
  setPhase(phase){this.phase=phase;this.elapsed=0;}
  drainEvents(){const events=this.events;this.events=[];return events;}
  cancel(){this.phase='room';this.elapsed=0;this.coldStart=false;this.events=[];}
}

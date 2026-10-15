const clamp=value=>Math.max(0,Math.min(1,value));

// Elapsed active seconds come from the persisted job, never a presentation timer.
export function recordingShot({elapsedSeconds,durationSeconds,bpm=90,reducedMotion=false}){
 const duration=Number.isFinite(durationSeconds)&&durationSeconds>0?durationSeconds:0;
 const elapsed=Math.max(0,Math.min(duration,Number.isFinite(elapsedSeconds)?elapsedSeconds:0));
 const tempo=Number.isFinite(bpm)&&bpm>0?bpm:90;
 const micEnd=Math.min(240/tempo,duration*.4),rearStart=duration*.8;
 return {phase:elapsed<micEnd?'mic':elapsed<rearStart?'screen':'rear',progress:duration?clamp(elapsed/duration):1,
  bob:reducedMotion?0:Math.sin(elapsed*tempo/60*Math.PI*2)*.012};
}

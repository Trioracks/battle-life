export function createFootstepCadence(stride=1){
 const half=Number.isFinite(stride)&&stride>0?stride/2:.5;let origin=null,last=0,bin=0;
 const reset=()=>{origin=null;last=0;bin=0;};
 return {reset,update({clip,walkDistance,paused=false}={}){
  if(paused||clip!=='walk'||!Number.isFinite(walkDistance)){reset();return false;}
  if(origin===null||walkDistance<last){origin=last=walkDistance;bin=0;return false;}
  last=walkDistance;const next=Math.floor((walkDistance-origin)/half+1e-9),emit=next>bin;bin=next;
  return emit; // Large jumps emit at most once, never replay a backlog.
 }};
}

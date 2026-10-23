const anchors=[[0,3],[25,Math.sqrt(3)],[50,1],[75,.3],[90,1/(10*Math.log(2))],[100,1/(20*Math.log(2))]];

export function beatPracticeBudget(skill){
 if(!Number.isFinite(skill)||skill<0||skill>100)throw new RangeError('Beat skill must be finite and between 0 and 100.');
 for(let i=0;i<anchors.length;i++){
  const [end,value]=anchors[i];
  if(skill===end)return value;
  if(skill<end){const [start,previous]=anchors[i-1];return previous*Math.pow(value/previous,(skill-start)/(end-start));}
 }
}

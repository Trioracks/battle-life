// Saved skill controls whether effects are intentional. Quality controls mistakes.
// Smooth at each boundary: no effect below 50, a learning peak, then restraint.
export function creativeEffectAmount(value){
 const skill=Number.isFinite(value)?Math.max(0,Math.min(100,value)):10;
 if(skill<=50||skill>=100)return 0;
 if(skill<65)return (skill-50)/15;
 if(skill<75)return 1-(skill-65)*.02;
 if(skill<90)return .8-(skill-75)/15*.65;
 return .15*(100-skill)/10;
}

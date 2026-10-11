// Saved skill controls whether effects are intentional. Quality controls mistakes.
import {normalizeGenreSnapshot} from './genre-progression.js?rev=34';
export function creativeProfileAmount(value,legacySkill,postGain=0){
 const profile=normalizeGenreSnapshot(value);
 if(!profile)return creativeEffectAmount(legacySkill);
 if(profile.id!=='experimental'||profile.xp<25||!Number.isFinite(postGain)||postGain<=0)return 0;
 const x=profile.xp,curve=x<50?.2+(x-25)/25*.6:x<75?.8-(x-50)/25*.3:.5-(x-75)/25*.2;
 return curve*Math.min(1,postGain/4);
}
// Smooth at each boundary: no effect below 50, a learning peak, then restraint.
export function creativeEffectAmount(value){
 const skill=Number.isFinite(value)?Math.max(0,Math.min(100,value)):10;
 if(skill<=50||skill>=100)return 0;
 if(skill<65)return (skill-50)/15;
 if(skill<75)return 1-(skill-65)*.02;
 if(skill<90)return .8-(skill-75)/15*.65;
 return .15*(100-skill)/10;
}

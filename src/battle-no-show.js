import {beatResultSeed} from './beat-result.js?rev=60';
import {battleRandom} from './battle-seeding.js?rev=60';
export function noShowProbability({ownMean,opponentMean,roundId,basePercent=5}={}){
 if(![ownMean,opponentMean,basePercent].every(v=>Number.isFinite(v)&&v>=0&&v<=100))throw new RangeError('No-show skills and probability use0…100');
 return ['round-5','final'].includes(roundId)?0:Math.min(100,basePercent+Math.max(0,opponentMean-ownMean)/2);
}
export function decideNoShow({characterId,pairId,roundId,ownMean,opponentMean,basePercent=5,seed=1,isPlayer=false}={}){
 const probability=isPlayer?0:noShowProbability({ownMean,opponentMean,roundId,basePercent}),roll=battleRandom(beatResultSeed([seed,pairId,characterId].join(':')))()*100;
 return {policyVersion:2,characterId,pairId,roundId,ownMean,opponentMean,basePercent,probability,roll,misses:!isPlayer&&roll<probability};
}
export function resolveTechnicalPair({participantIds,submissionIds}={}){
 if(!Array.isArray(participantIds)||participantIds.length!==2||!Array.isArray(submissionIds)||submissionIds.length!==2)throw new TypeError('A pair has two slots');
 const present=participantIds.filter(Boolean);let kind,winnerId=null,eliminatedIds=[],noShowIds=[];
 if(!present.length)kind='empty';
 else if(present.length===1){kind='bye';winnerId=present[0];}
 else {
  noShowIds=participantIds.filter((id,i)=>!submissionIds[i]);
  if(noShowIds.length===0)kind='judged';
  else if(noShowIds.length===1){kind='technical_win';winnerId=participantIds.find(id=>id!==noShowIds[0]);eliminatedIds=[...noShowIds];}
  else {kind='double_no_show';eliminatedIds=[...noShowIds];}
 }
 return {kind,winnerId,eliminatedIds,noShowIds,emptyNextSlot:kind==='empty'||kind==='double_no_show'};
}

import {beatResultSeed} from './beat-result.js?rev=44';
export function battleRandom(seed){let x=seed>>>0;return()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};}
export function seededLottery(ids,seed){
 const list=[...ids].sort(),random=battleRandom(beatResultSeed(String(seed)));
 for(let i=list.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[list[i],list[j]]=[list[j],list[i]];}return list;
}
export function rankTournamentSelection(ids,gradesById,{limit=32,seed=1}={}){
 if(!Number.isInteger(limit)||limit<1||new Set(ids).size!==ids.length)throw new RangeError('Invalid selection candidates');
 const lottery=seededLottery(ids,seed),order=new Map(lottery.map((id,i)=>[id,i])),ranked=[],pendingIds=[];
 for(const id of ids){const grades=gradesById[id];if(!grades){pendingIds.push(id);continue;}
  if(!Array.isArray(grades)||grades.length!==5||grades.some(g=>!Number.isFinite(g)||g<0||g>10||g*2%1))throw new RangeError('Selection requires five half-step grades');
  ranked.push({participantId:id,grades:[...grades],total:grades.reduce((n,g)=>n+g,0),lotteryOrder:order.get(id)});
 }
 ranked.sort((a,b)=>b.total-a.total||a.lotteryOrder-b.lotteryOrder);ranked.forEach((r,i)=>r.place=i+1);
 return {ranked,qualifiedIds:pendingIds.length?[]:ranked.slice(0,limit).map(r=>r.participantId),pendingIds:pendingIds.sort(),tiePolicy:'seeded-lottery',lottery};
}
export function seedBracket(qualifiedIds,{mode='neighbors',seed=1}={}){
 const n=qualifiedIds.length;
 if(n<2||n&(n-1)||new Set(qualifiedIds).size!==n||qualifiedIds.some(id=>typeof id!=='string'||!id)||!['neighbors','random','opposite'].includes(mode))throw new RangeError('Unique power-of-two field and known seeding required');
 let entrants=[...qualifiedIds];
 if(mode==='random')entrants=seededLottery(entrants,seed);
 if(mode==='opposite'){
  let positions=[1,2];while(positions.length<n){const next=positions.length*2+1;positions=positions.flatMap(p=>[p,next-p]);}entrants=positions.map(p=>qualifiedIds[p-1]);
 }
 const rounds=[];for(let r=0,size=n/2;size>=1;r++,size/=2){
  const nodes=Array.from({length:size},(_,i)=>({id:'node-'+r+'-'+i,roundIndex:r,index:i,participantIds:r===0?entrants.slice(i*2,i*2+2):[null,null],sourceNodeIds:r===0?[]:[rounds[r-1][i*2].id,rounds[r-1][i*2+1].id],nextNodeId:size>1?'node-'+(r+1)+'-'+Math.floor(i/2):null,winnerId:null,resolved:false}));rounds.push(nodes);
 }return {mode,seed,rounds};
}

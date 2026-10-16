import {createVirtualPcState} from '../../src/virtual-pc-state.js';
export function tableFixture(){
 const state=createVirtualPcState({battleApplications:[{battleId:'makarevich-1',nickname:'Герой'}]}),ids=['player','mak-npc-01','mak-npc-02'],judgeIds=['eparhiya','thirty-third','klim-propavshiy'];
 const round={id:'makarevich-1:selection:1',roundId:'selection',opensAt:600,closesAt:10680,judgeIds,status:'complete',completedAt:12000,submissions:Object.fromEntries(ids.map(id=>[id,'track:'+id])),noShows:{},pairs:[],judgeBatches:{}};
 for(const [i,id]of ids.entries())for(const [j,judgeId]of judgeIds.entries()){const key=id+':'+judgeId;state.judging.results[key]={id:key,ok:true,battleId:'makarevich-1',roundId:'selection',judgeId,trackVersionId:'track:'+id,grade:8-i*.5,raw:7.93-i*.5,comment:'Отзыв о работе '+id,templateIds:[],evidenceIds:[],knownFacts:['private'],decision:{kind:'grade'}};}
 for(const [i,judgeId]of judgeIds.entries())round.judgeBatches[judgeId]={judgeId,publishedAt:11000+i*500,resultIds:ids.map(id=>id+':'+judgeId),ltr:{judgeId,participantId:'mak-npc-02',trackVersionId:'track:mak-npc-02',rawScore:8.59}};
 state.tournaments={version:2,recovery:[],byId:{'makarevich-1':{battleId:'makarevich-1',policyVersion:2,seed:1,status:'active',participantIds:ids,currentRoundId:'selection',rounds:{selection:round},qualifiedIds:['player','mak-npc-01'],selection:{ranked:ids.map((participantId,i)=>({participantId,place:i+1,total:24-i*1.5}))},events:[],nextRoundAt:13440}}};return state;
}

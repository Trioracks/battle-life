import {tableFixture} from './tournament-table-fixture.js';
export function outcomeFixture(kind='selection_loss'){
 const s=tableFixture(),t=s.tournaments.byId['makarevich-1'],r=t.rounds.selection;s.socialRuntime.lastMinute=12000;s.trackVersions.byId['track:player']={id:'track:player'};
 if(kind==='selection_loss')t.qualifiedIds=['mak-npc-01'];
 if(kind==='no_show'){delete r.submissions.player;t.qualifiedIds=['mak-npc-01'];}
 if(['pair_loss','technical_win','champion'].includes(kind)){r.roundId=kind==='champion'?'final':'round-2';r.id='makarevich-1:'+r.roundId+':1';t.rounds={[r.roundId]:r};r.pairs=[{participantIds:['player','mak-npc-01'],winnerId:kind==='pair_loss'?'mak-npc-01':'player',technical:{kind:kind==='technical_win'?'technical_win':'judged'}}];}
 for(const result of Object.values(s.judging.results))result.roundId=r.roundId;
 if(kind==='technical_win')r.judgeBatches={};
 const event={id:'round-result:'+r.roundId,type:'round-result',battleId:'makarevich-1',roundId:r.roundId,dueAt:12000};t.events=[event];s.socialRuntime.events=[event];s.testEvent=event;return s;
}

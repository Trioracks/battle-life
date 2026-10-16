import test from 'node:test';
import assert from 'node:assert/strict';
import {noShowProbability,decideNoShow,resolveTechnicalPair} from '../src/battle-no-show.js';
import {recordBattleHistory,normalizeBattleHistory} from '../src/battle-history.js';
test('no-show uses one skill scale and no NPC misses semifinal/final or forces player to miss',()=>{
 for(const [ownMean,opponentMean,expected]of [[12,42,20],[12,45,21.5],[45,12,5],[12,12,5]])assert.equal(noShowProbability({ownMean,opponentMean,roundId:'round-2'}),expected);
 assert.equal(noShowProbability({ownMean:12,opponentMean:42,basePercent:10,roundId:'round-2'}),25);
 for(const roundId of ['round-5','final'])assert.equal(noShowProbability({ownMean:0,opponentMean:100,roundId}),0);
 const options={characterId:'npc',pairId:'pair',roundId:'round-2',ownMean:12,opponentMean:42,seed:100};assert.deepEqual(decideNoShow(options),decideNoShow(options));
 assert.equal(decideNoShow({...options,characterId:'player',isPlayer:true}).misses,false);assert.throws(()=>noShowProbability({...options,ownMean:NaN}));
});
test('technical outcomes retain double elimination and propagate empty slots without fake zero tracks',()=>{
 assert.equal(resolveTechnicalPair({participantIds:['a','b'],submissionIds:['ta','tb']}).kind,'judged');
 assert.deepEqual(resolveTechnicalPair({participantIds:['a','b'],submissionIds:['ta',null]}),{kind:'technical_win',winnerId:'a',eliminatedIds:['b'],noShowIds:['b'],emptyNextSlot:false});
 assert.deepEqual(resolveTechnicalPair({participantIds:['a','b'],submissionIds:[null,null]}),{kind:'double_no_show',winnerId:null,eliminatedIds:['a','b'],noShowIds:['a','b'],emptyNextSlot:true});
 assert.equal(resolveTechnicalPair({participantIds:['a',null],submissionIds:[null,null]}).winnerId,'a','empty branch is an automatic bye');
 assert.equal(resolveTechnicalPair({participantIds:[null,null],submissionIds:[null,null]}).kind,'empty');
});
test('both no-show histories are durable, idempotent and preserve damaged evidence',()=>{
 const entries=['a','b'].flatMap(participantId=>['no_show','eliminated'].map(status=>({id:participantId+':'+status,participantId,battleId:'makarevich-1',roundId:'round-2',status,trackVersionId:null,resultId:null,occurredAt:10080})));
 const first=recordBattleHistory({},entries),twice=recordBattleHistory(first,entries);assert.equal(twice.battleHistory.entries.length,4);assert.deepEqual(normalizeBattleHistory(JSON.parse(JSON.stringify(twice.battleHistory))),first.battleHistory);
 assert.equal(normalizeBattleHistory({entries:[{id:'bad',original:'keep'}]}).recovery[0].recoveryData.original,'keep');
});

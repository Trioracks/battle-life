import test from 'node:test';
import assert from 'node:assert/strict';
import {publicBattleHistory,recordBattleHistory} from '../src/battle-history.js';
test('public participant history filters future and unrelated rows without exposing no-show plans',()=>{
 const rows=['a','b'].flatMap(participantId=>['no_show','eliminated'].map((status,i)=>({id:participantId+status,participantId,battleId:'makarevich-1',roundId:'round-2',status,occurredAt:100+i*60,trackVersionId:null,resultId:null})));
 const s=recordBattleHistory({},rows);assert.equal(publicBattleHistory(s,{participantId:'a',nowMinute:99}).length,0);assert.deepEqual(publicBattleHistory(s,{participantId:'a',nowMinute:100}).map(e=>e.status),['no_show']);
 for(const participantId of ['a','b'])assert.deepEqual(publicBattleHistory(recordBattleHistory(s,rows),{participantId,nowMinute:200}).map(e=>e.status),['no_show','eliminated']);
});

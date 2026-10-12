import test from 'node:test';
import assert from 'node:assert/strict';
import {profileAccess} from '../src/social-profile-policy.js';
import {opponentFixture} from './helpers/social-profile-fixture.js';
import {resolveSocialRoute} from '../src/social-routing.js';
import {publicRoundTable} from '../src/battle-results-table.js';
const npc='mak-npc-01';
test('own page, assigned/former opponent and announced judge have distinct access; known name is not access',()=>{
 const s=opponentFixture(),check=(characterId,nowMinute)=>profileAccess(s,{viewerId:'player',characterId,nowMinute});
 assert.equal(check('player',100).canView,true);assert.equal(check(npc,13439).canView,false);assert.equal(check(npc,13440).canView,true);assert.equal(check(npc,99999).canView,true);
 assert.equal(check('mak-npc-02',99999).canView,false);assert.equal(check('mak-npc-02',99999).canAddFriend,false);assert.equal(check('eparhiya',13439).canView,false);assert.equal(check('eparhiya',13440).canView,true);
 assert.equal(resolveSocialRoute('underweb://social/profile/'+npc).profileId,npc);assert.equal(resolveSocialRoute('underweb://social/profile/eparhiya').profileId,'eparhiya');
 const table=publicRoundTable(s,{battleId:'makarevich-1',roundId:'selection',nowMinute:13440});assert.equal(table.rows.find(r=>r.participantId===npc).profileUrl,'underweb://social/profile/'+npc);
 assert.equal(table.judges.find(j=>j.id==='eparhiya').profileUrl,'underweb://social/profile/eparhiya');
});

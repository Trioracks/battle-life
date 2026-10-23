import test from 'node:test';
import assert from 'node:assert/strict';
import {migrateBattleDeadlines} from '../src/battle-windows.js';
const window={id:'makarevich-1:selection:1',battleId:'makarevich-1',roundId:'selection',opensAt:37,closesAt:10117};
function fixture(){return {battleWindows:[structuredClone(window)],tournaments:{byId:{'makarevich-1':{rounds:{selection:{...window,status:'accepting'}}}}},battleSubmissions:[]};}
test('an active future legacy deadline can align once with a recorded original time',()=>{
 const s=fixture(),r=migrateBattleDeadlines(s,500);
 assert.equal(s.battleWindows[0].closesAt,10117);assert.equal(r.changed,true);
 assert.equal(r.state.battleWindows[0].closesAt,10080);
 assert.equal(r.state.tournaments.byId['makarevich-1'].rounds.selection.closesAt,10080);
 assert.equal(r.state.battleWindows[0].deadlineMigration.previousClosesAt,10117);
 assert.equal(migrateBattleDeadlines(r.state,600).changed,false);
});
test('an elapsed deadline or accepted submission in the removed interval is never retimed',()=>{
 const s=fixture();assert.equal(migrateBattleDeadlines(s,10090).changed,false);
 s.battleSubmissions=[{windowId:window.id,sentAt:10090,status:'accepted'}];assert.equal(migrateBattleDeadlines(s,500).changed,false);
 s.battleSubmissions=[];s.tournaments.byId['makarevich-1'].rounds.selection.status='complete';
 assert.equal(migrateBattleDeadlines(s,500).changed,false);
});

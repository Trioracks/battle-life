import test from 'node:test';
import assert from 'node:assert/strict';
import {ensureBattleWindow} from '../src/battle-windows.js';
import {battleStage} from '../src/battle-stage.js';
import {ensureTournament} from '../src/battle-tournament.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {mountSocialDialog} from '../src/social-dialog-view.js';
import {pcDocument,allPc} from './helpers/virtual-pc-dom.js';

const battleId='makarevich-1';
function fixture(){
 const state=ensureBattleWindow({battleWindows:[]},{battleId,nowMinute:37,judgingPolicyVersion:2}).state;
 const window=state.battleWindows[0];
 state.roundThemes={[battleId+':selection']:{id:'theme-1',title:'Не переключай'}};
 state.tournaments={byId:{[battleId]:{currentRoundId:'selection',status:'active',rounds:{selection:{...window,status:'accepting'}}}}};
 return state;
}
test('a new reception closes at midnight independent of the minute it was opened',()=>{
 const state=fixture();assert.equal(state.battleWindows[0].closesAt,10080);
 assert.equal(battleStage(state,{battleId,nowMinute:10079}).canSubmit,true);
 assert.equal(battleStage(state,{battleId,nowMinute:10080}).canSubmit,false);
});
test('a newly authored theme keeps the same canonical deadline as its round',()=>{
 const s=ensureBattleWindow({battleWindows:[]},{battleId,nowMinute:37,judgingPolicyVersion:2}).state;
 const r=ensureTournament(s,{battleId,nowMinute:37});assert.equal(r.ok,true);
 assert.equal(r.state.roundThemes[battleId+':selection'].closesAt,10080);
});
test('the stage changes at the deadline while retaining the theme and direct round link',()=>{
 const state=fixture(),before=battleStage(state,{battleId,nowMinute:10079}),after=battleStage(state,{battleId,nowMinute:10080});
 assert.equal(before.kind,'accepting');assert.match(before.heading,/Приём заявок и треков/);
 assert.equal(before.deadlineLabel,'08.09.2012 00:00');
 assert.equal(after.kind,'judging');assert.match(after.heading,/Судейство.*отбора/i);
 assert.equal(after.themeTitle,'Не переключай');assert.equal(after.themeId,'theme-1');
 assert.equal(after.tableUrl,'underweb://social/results/makarevich-1/selection');
 assert.equal(after.deadlineMinute,12960);
});
test('complete rounds show the next announcement, and finished tournaments show the final result',()=>{
 const state=fixture(),t=state.tournaments.byId[battleId],r=t.rounds.selection;
 r.status='complete';r.completedAt=11100;t.nextRoundAt=12960;
 const wait=battleStage(state,{battleId,nowMinute:11200});assert.equal(wait.kind,'waiting-next');assert.equal(wait.deadlineMinute,12960);
 t.status='complete';t.nextRoundAt=null;assert.equal(battleStage(state,{battleId,nowMinute:11200}).kind,'complete');
});
test('damaged or not-yet-open rounds cannot offer submission or fabricate a deadline',()=>{
 assert.equal(battleStage({},{battleId,nowMinute:0}).kind,'not-started');
 const state=fixture();state.battleWindows[0].issue='Повреждено';
 assert.equal(battleStage(state,{battleId,nowMinute:50}).canSubmit,false);
 assert.equal(battleStage(state,{battleId,nowMinute:50}).kind,'recovery');
});
test('an open community chat updates its header when reception turns into judging',()=>{
 const d=pcDocument();let now=10079;
 const state=ensureBattleWindow(createVirtualPcState(),{battleId,nowMinute:37,judgingPolicyVersion:2}).state;
 const view=mountSocialDialog(d,{id:battleId,getState:()=>state,getMetadata:()=>({gameMinutes:now,playerName:'Герой'}),navigate(){},commit(){return true;},audio:{releaseRows(){}}});
 const stage=()=>allPc(view.root).find(n=>n.className==='sn-battle-stage');
 assert.match(stage()?.textContent??'',/Приём заявок и треков.*00:00/);
 now=10080;view.update();assert.match(stage().textContent,/Судейство отбора/);view.dispose();
});

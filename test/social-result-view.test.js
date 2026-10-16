import test from 'node:test';
import assert from 'node:assert/strict';
import {mountSocial} from '../src/social-view.js';
import {resolveSocialRoute} from '../src/social-routing.js';
import {advanceSocial} from '../src/social-runtime.js';
import {sentFixture} from './social-judging-events.test.js';
import {pcDocument,allPc,findButton} from './helpers/virtual-pc-dom.js';
test('public page reveals only due reviews, full view queues once and does not announce qualification',()=>{
 let state=sentFixture();const w=state.battleWindows[0];state=advanceSocial(state,w.closesAt+w.judgingOffsets[0]).state;
 const d=pcDocument(),root=d.createElement('div'),view=mountSocial(root,{route:resolveSocialRoute('underweb://social/community/makarevich-1'),getState:()=>state,onChange:next=>{state=next;return true;},navigate:()=>{}});
 assert.equal(allPc(root).filter(n=>n.dataset?.judgeReview).length,1);assert.equal(findButton(root,'Открыть общий итог'),undefined);
 state=advanceSocial(state,w.closesAt+4321).state;view.update();findButton(root,'Открыть общий итог').click();
 assert.equal(state.resultReactions.items.length,1);assert.equal(allPc(root).filter(n=>n.dataset?.judgeReview).length,5);assert.ok(allPc(root).some(n=>n.textContent?.includes('Решение о проходе ещё не опубликовано')));
 assert.ok(!allPc(root).some(n=>/formatPenalty|personalQuality|strictnessOffset/.test(n.textContent??'')));view.update();assert.equal(state.resultReactions.items.length,1);view.dispose();
});

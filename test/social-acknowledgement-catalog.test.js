import test from 'node:test';
import assert from 'node:assert/strict';
import {ACK_TEMPLATES,acknowledgementFor,acknowledgementBodyFor,resolveAcknowledgementTemplate} from '../src/social-submission.js';
import {ensureBattleWindow} from '../src/battle-windows.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
test('fifty human acknowledgement templates retain legacy aliases and resolve real deadlines',()=>{
 assert.ok(ACK_TEMPLATES.length>=50);assert.equal(new Set(ACK_TEMPLATES.map(t=>t.id)).size,ACK_TEMPLATES.length);assert.equal(new Set(ACK_TEMPLATES.map(t=>t.body)).size,ACK_TEMPLATES.length);
 for(let i=1;i<=10;i++)assert.ok(resolveAcknowledgementTemplate('ack-'+i));
 const s=ensureBattleWindow(createVirtualPcState(),{battleId:'makarevich-1',nowMinute:600}).state;for(const t of ACK_TEMPLATES){assert.ok(t.tone&&t.roundKinds.length);const body=acknowledgementBodyFor(s,{ackTemplateId:t.id,battleId:'makarevich-1',communityId:'makarevich-1',roundId:'selection',windowId:s.battleWindows[0].id});assert.doesNotMatch(body,/\{[^}]+\}/);assert.ok(body.length>30);}
 for(let i=0;i<100;i++){const r=acknowledgementFor('new-round:'+i,100,'round-2'),t=resolveAcknowledgementTemplate(r.ackTemplateId);assert.ok(t.roundKinds.includes('knockout'));assert.doesNotMatch(t.body,/отбор/i);}
});

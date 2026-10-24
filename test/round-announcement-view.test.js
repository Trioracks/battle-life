import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoundAnnouncementView} from '../src/round-announcement-view.js';
import {gameDateTimeLabel} from '../src/home-calendar.js';
import {ROUND_LABELS} from '../src/battle-results-table.js';
import {pcDocument,allPc} from './helpers/virtual-pc-dom.js';

test('every round cover contains its own stage, topic and submission deadline',()=>{
 for(const [roundId,label]of Object.entries(ROUND_LABELS)){
  const closesAt=11520+Object.keys(ROUND_LABELS).indexOf(roundId)*10080,theme={id:'makarevich-1:'+roundId,title:roundId==='selection'?'Не переключай':'Чужое зеркало',coverId:null,closesAt};
  const root=createRoundAnnouncementView(pcDocument(),{battleId:'makarevich-1',roundId,theme,date:'02.09.2012 00:00',author:'Судья',body:'Анонс'},{stage:{kind:'judging',heading:'Судейство',deadlineLabel:'12.09.2012 00:00'}});
  const cover=allPc(root).find(n=>n.className==='sn-round-cover'),text=allPc(cover).map(n=>n.textContent).join('\n');
  assert.ok(text.includes('Этап: '+label));assert.ok(text.includes('Тема на раунд: '+theme.title));assert.ok(text.includes('Сроки: До '+gameDateTimeLabel(closesAt)));
  assert.ok(!text.includes('12.09.2012 00:00'),'the cover keeps its submission deadline during judging');
 }
});

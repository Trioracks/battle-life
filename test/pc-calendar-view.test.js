import test from 'node:test';
import assert from 'node:assert/strict';
import * as calendar from '../src/pc-calendar-view.js';
import * as dates from '../src/home-calendar.js';
import {pcDocument,allPc,fire} from './helpers/virtual-pc-dom.js';
test('calendar dates use epoch, Monday-first blanks and month rollover independently of host date',()=>{
 assert.equal(dates.gameDateTimeLabel(0),'01.09.2012 00:00');assert.equal(dates.gameDateTimeLabel(30*1440),'01.10.2012 00:00');assert.equal(dates.gameDateTimeLabel(1439),'01.09.2012 23:59');
 const sep=dates.gameMonthGrid(1);assert.equal(sep.year,2012);assert.equal(sep.month,9);assert.ok(sep.days.slice(0,5).every(x=>x===null));assert.deepEqual(sep.days[5],{day:1,gameDay:1,current:true});assert.equal(dates.gameMonthGrid(31).days[0].day,1);
});
test('read-only calendar highlights today, updates month, Escape closes and returns focus',()=>{
 const d=pcDocument(),anchor=d.createElement('button');let day=1,closed=0;const view=calendar.mountPcCalendar({document:d,anchor,getGameDay:()=>day,onClose:()=>closed++});
 assert.ok(allPc(view.root).some(n=>n.getAttribute('aria-current')==='date'&&n.textContent==='1'));assert.equal(allPc(view.root).filter(n=>['INPUT','SELECT'].includes(n.tagName)).length,0);
 day=31;view.update();assert.ok(allPc(view.root).some(n=>n.textContent==='Октябрь 2012'));fire(view.root,'keydown',{key:'Escape'});assert.equal(closed,1);assert.equal(d.activeElement,anchor);view.dispose();
});

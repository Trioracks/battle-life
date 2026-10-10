import test from 'node:test';
import assert from 'node:assert/strict';
import {ApartmentTime,loadHomeTime,saveHomeTime} from '../src/apartment-v3-time.js?rev=25';

test('game date follows game days, midnight and sleep rather than the host calendar',()=>{
 const clock=new ApartmentTime({day:1,minutes:1439});
 assert.equal(clock.dateLabel,'01.09.2012');
 clock.advanceMinutes(2);assert.equal(clock.dateLabel,'02.09.2012');
 const month=new ApartmentTime({day:30,minutes:1430});month.beginSleep({minutes:60,seconds:1});month.tick(1);
 assert.equal(month.dateLabel,'01.10.2012');assert.equal(month.label,'00:50');
 const saved=new Map(),storage={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)};
 saveHomeTime(storage,month);assert.equal(loadHomeTime(storage).dateLabel,'01.10.2012');
 assert.equal(new ApartmentTime({day:123,minutes:0}).dateLabel,'01.01.2013');
});

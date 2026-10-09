import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const audit=records=>JSON.parse(execFileSync('F:/Python/python.exe',['-B','tools/audit-apartment-v3.py'],{cwd:new URL('../',import.meta.url),input:JSON.stringify({objects:records}),encoding:'utf8'}));
const obj=(name,assembly,min,max,role='furniture')=>({name,assembly,min,max,role,materials:['wood']});
test('geometry audit rejects floating chair legs and props without desk support',()=>{
 const result=audit([obj('chair-leg','chair',[4,.04,0],[4.04,.4,.04],'chair-leg'),obj('keyboard','desk',[4,.9,-.8],[4.5,.95,-.6],'desk-prop'),obj('desk-top','desk',[3,.74,-1.3],[5.6,.8275,-.45],'desktop')]);
 assert.ok(result.errors.some(e=>e.includes('chair-leg')));assert.ok(result.errors.some(e=>e.includes('keyboard')));
});
test('geometry audit catches reserved-zone obstruction and independent wall penetration',()=>{
 const result=audit([obj('dresser','dresser',[6,0,-1.3],[7,1,-.8]),obj('wall','shell',[7.9,0,-1.7],[8.1,3,1.8],'wall'),obj('cabinet','cabinet',[7.8,0,-.5],[8.3,1,.2])]);
 assert.ok(result.errors.some(e=>e.includes('reserve')&&e.includes('dresser')));assert.ok(result.errors.some(e=>e.includes('wall')&&e.includes('cabinet')));
});
test('geometry audit accepts intended tabletop and leg joints',()=>{
 const result=audit([obj('chair-leg','chair',[4,0,0],[4.04,.4,.04],'chair-leg'),obj('keyboard','desk',[4,.8275,-.8],[4.5,.87,-.6],'desk-prop'),obj('desk-top','desk',[3,.74,-1.3],[5.6,.8275,-.45],'desktop')]);
 assert.deepEqual(result.errors,[]);
});

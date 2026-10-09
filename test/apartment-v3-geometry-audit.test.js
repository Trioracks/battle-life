import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const audit=records=>JSON.parse(execFileSync('F:/Python/python.exe',['-B','tools/audit-apartment-v3.py'],{cwd:new URL('../',import.meta.url),input:JSON.stringify({objects:records}),encoding:'utf8'}));
const obj=(name,assembly,min,max,role='furniture')=>({name,assembly,min,max,role,materials:['wood']});

test('named prop audit rejects sill penetration, unsupported mouse, buried pot and hood overlap',()=>{
 const fixed=[obj('window-sill','sill',[4,1,-1.5],[6,1.2,-1.07],'window-sill'),obj('desk-top','desk',[3,.74,-1.3],[5.6,.8275,-.45],'desktop'),obj('burner-grate','stove',[-3.3,.994,-1.35],[-2.9,1.008,-1],'cooker-support'),obj('upper-cupboard','cabinet',[-4,2,-1.6],[-3.8,2.6,-1],'upper-cabinet')];
 const bad=[obj('microphone-capsule','mic',[5,1.1,-1.15],[5.1,1.3,-1.05],'microphone'),obj('mouse','desk',[5,.85,-.6],[5.1,.9,-.5],'desk-prop'),obj('saucepan','pot',[-3.2,.99,-1.3],[-3,1.15,-1.05],'cooking-pot'),obj('hood-canopy','hood',[-3.9,2.1,-1.4],[-3,2.3,-1.1],'hood')];
 const errors=audit([...fixed,...bad]).errors.join('\n');
 for(const name of ['microphone','mouse','saucepan','hood'])assert.match(errors,new RegExp(name));
 const good=[obj('microphone-capsule','mic',[5,1.1,-1.04],[5.1,1.3,-.97],'microphone'),obj('mouse','desk',[5,.8275,-.6],[5.1,.87,-.5],'desk-prop'),obj('saucepan','pot',[-3.2,1.008,-1.3],[-3,1.16,-1.05],'cooking-pot'),obj('hood-canopy','hood',[-3.78,2.1,-1.4],[-3,2.3,-1.1],'hood')];
 assert.deepEqual(audit([...fixed,...good]).errors,[]);
});
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

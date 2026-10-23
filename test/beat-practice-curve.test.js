import test from 'node:test';
import assert from 'node:assert/strict';
const api=await import('../src/beat-practice-curve.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
const budget=s=>{assert.equal(typeof api.beatPracticeBudget,'function');return api.beatPracticeBudget(s);};

test('curve hits agreed anchors',()=>{
 for(const [skill,want] of [[0,3],[25,Math.sqrt(3)],[50,1],[75,.3]])assert.equal(budget(skill),want);
 for(const [skill,want] of [[90,1/(10*Math.log(2))],[100,1/(20*Math.log(2))]])assert.ok(Math.abs(budget(skill)-want)<1e-12);
});
test('ninety to one hundred takes one hundred beats',()=>{
 let skill=90,count=0;
 while(skill<100&&count<200){skill=Math.min(100,skill+budget(skill));count++;}
 assert.equal(skill,100);assert.equal(count,100);
});
test('practice budget decreases on the hundredth skill grid',()=>{
 let previous=budget(0);
 for(let i=1;i<=10000;i++){const value=budget(i/100);assert.ok(value>0&&value<previous);previous=value;}
});
test('practice budget refuses nonfinite and out of range skills',()=>{
 for(const value of [NaN,Infinity,-Infinity,-.01,100.01,'50',null])assert.throws(()=>budget(value),RangeError);
});

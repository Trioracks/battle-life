import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBeatName} from '../src/beat-names.js';
test('the random title catalog can produce one two and three word names without immediate repeats',()=>{
 const lengths=new Set(),names=[];
 for(let i=0;i<1000;i++){const name=randomBeatName(1,names.at(-1),()=>i/1000,names);names.push(name);lengths.add(name.replace(/^.*? — /,'').replace(/ \(\d+\)$/,'').split(' ').length);}
 assert.deepEqual([...lengths].sort(),[1,2,3]);assert.equal(new Set(names).size,1000);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createFootstepCadence} from '../src/footstep-cadence.js';
test('first sample is silent and each half stride emits one sound',()=>{
 const c=createFootstepCadence(1),walk=x=>c.update({clip:'walk',walkDistance:x});
 assert.equal(walk(10),false);assert.equal(walk(10.49),false);assert.equal(walk(10.5),true);assert.equal(walk(10.5),false);
 assert.equal(walk(11),true);assert.equal(walk(900),true);assert.equal(walk(900),false);
 c.update({clip:'idle',walkDistance:900});assert.equal(walk(950),false);
 c.update({clip:'walk',walkDistance:950,paused:true});assert.equal(walk(999),false);
 c.reset();assert.equal(walk(1000),false);assert.equal(walk(0),false);assert.equal(walk(NaN),false);
});
test('host has one movement-owned cue, not click or action-owned footsteps',async()=>{
 const source=await readFile(new URL('../src/apartment-app.js',import.meta.url),'utf8');
 assert.equal([...source.matchAll(/cue\('footstep'\)/g)].length,1);
 assert.match(source,/footsteps\.update/);assert.match(source,/footsteps\.reset/);
});

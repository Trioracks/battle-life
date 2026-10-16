import test from 'node:test';
import assert from 'node:assert/strict';
import {execPython} from './helpers/python.js';
import fs from 'node:fs';
import {assetPath} from './helpers/apartment-assets.js';

const root=new URL('../',import.meta.url);
test('installed manifest agrees with all canonical routes and room extents',()=>{
 const actual=JSON.parse(fs.readFileSync(assetPath('scene.json'))),expected=exported();
 for(const key of ['layout','bounds','entryDoor','entryExit','peepholeCamera','actions'])assert.deepEqual(actual[key],expected[key],key);
});
function exported(){return JSON.parse(execPython(['-B','tools/apartment_v3_layout.py'],{cwd:root,encoding:'utf8'}));}
test('expanded routes share the moved door, exit and walking bounds',()=>{
 const c=exported();assert.deepEqual(c.bounds,[-7.6,8.15]);assert.equal(c.entryDoor.hinge[0],8.5);
 assert.equal(c.entryDoor.threshold,8.55);assert.equal(c.entryDoor.closedBounds,8.15);assert.equal(c.entryExit.position[0],10.35);
 assert.equal(c.peepholeCamera.position[0],8.61);assert.equal(c.actions.dining.approach[0],-7.25);
 for(const [id,a] of Object.entries(c.actions))if(a.approach){assert.ok(a.approach[0]>=-7.6&&a.approach[0]<=8.15,id);assert.equal(a.approach[2],.85,id);}
 assert.deepEqual(c.actions.computer.pose,[4.48,.045,-.02]);assert.deepEqual(c.actions.bed.pose,[1.84,.95,-.8]);
});
test('new room shell retains matching window proportions and free furnishing space',()=>{
 const l=JSON.parse(fs.readFileSync(new URL('../tools/apartment-v3-layout.json',import.meta.url)));
 assert.deepEqual(l.rooms.kitchen.x,[-8,0]);assert.deepEqual(l.rooms.living.x,[0,8.5]);
 assert.deepEqual(l.furnitureReserve.min,[5.95,0,-1.5]);assert.deepEqual(l.furnitureReserve.max,[7.75,2,-.7]);
 assert.equal(l.railZ,.85);assert.equal(l.windows.length,3);
 for(const w of l.windows){assert.equal(w.width,1.08);assert.equal(w.height,1.46);}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {execPython} from './helpers/python.js';
test('courtyard builder creates two actual five-storey volumes and chimney-top emitters',()=>{
 const script=`import sys,json;sys.path.insert(0,'tools')
from apartment_v3_exterior import add_exterior
from apartment_v3_layout import load_layout
objects=[]
def cube(name,loc,size,mat,*args,**kwargs):
 o=dict(name=name,loc=loc,size=size,material=mat);objects.append(o);return o
def cylinder(name,loc,radius,depth,mat,*args,**kwargs):return cube(name,loc,(radius*2,radius*2,depth),mat)
c=add_exterior(None,dict(cube=cube,cylinder=cylinder,material=lambda name,*args,**kwargs:name),load_layout())
c.pop('roots');print(json.dumps(dict(exterior=c,objects=objects)))`;
 const {exterior:e,objects}=JSON.parse(execPython(['-B','-c',script],{cwd:new URL('../',import.meta.url),encoding:'utf8'}));
 assert.equal(e.farPlane,200);assert.ok(e.buildings.length>=2);
 for(const b of e.buildings){assert.equal(b.floors,5);assert.ok(b.bounds.max[2]-b.bounds.min[2]>4);assert.ok(objects.filter(o=>o.name.startsWith(b.id+'-window-row')).length>=30);assert.ok(objects.some(o=>o.name===b.id+'-entrance-door'));assert.equal(objects.filter(o=>o.name===b.id+'-balcony-slab').length,8);}
 for(const emitter of e.emitters){const chimney=objects.find(o=>o.name===emitter.id);assert.ok(chimney);assert.equal(emitter.position[1],chimney.loc[2]+chimney.size[2]/2);}
});

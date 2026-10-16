import test from 'node:test';
import assert from 'node:assert/strict';
import {execPython} from './helpers/python.js';
test('incremental static export excludes courtyard, cutaway mask, depth and live objects',()=>{
 const code=`import sys,json;sys.path.insert(0,'tools')
from types import SimpleNamespace
from apartment_v3_roles import is_interior_static
names=['rear-living','first-person-ceiling-living','dining-chair-pad','block-east-body','exterior-courtyard-ground','factory-stack-west','cutaway-surround.001','depth-bed','hinge-entry']
result={name:is_interior_static(SimpleNamespace(name=name,type='MESH'),{'hinge-entry'}) for name in names}
for role in ['exterior','cutaway-mask','computer-live']:
 obj=SimpleNamespace(name='renamed-by-artist',type='MESH',get=lambda key:role)
 result[role]=is_interior_static(obj,set())
print(json.dumps(result))`;
 const result=JSON.parse(execPython(['-B','-c',code],{cwd:new URL('../',import.meta.url),encoding:'utf8'}));
 assert.deepEqual(result,{'rear-living':true,'first-person-ceiling-living':true,'dining-chair-pad':true,'block-east-body':false,'exterior-courtyard-ground':false,'factory-stack-west':false,'cutaway-surround.001':false,'depth-bed':false,'hinge-entry':false,exterior:false,'cutaway-mask':false,'computer-live':false});
});

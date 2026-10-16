import test from 'node:test';
import assert from 'node:assert/strict';
import {pcDocument,allPc} from './helpers/virtual-pc-dom.js';
import {diskUsage,createVirtualPcState} from '../src/virtual-pc-state.js?rev=28';
const api=await import('../src/virtual-pc-disk-view.js').catch(error=>{
  if(error.code==='ERR_MODULE_NOT_FOUND')return {};throw error;
});
test('disk meter shows system reserve and preserves nodes on background updates',()=>{
  assert.equal(typeof api.mountDiskUsage,'function','disk presentation exists');
  const root=pcDocument().createElement('span'),view=api.mountDiskUsage(root);
  view.update(diskUsage(createVirtualPcState()));
  const meter=allPc(root).find(n=>n.getAttribute('role')==='meter');
  assert.equal(meter.getAttribute('aria-valuemax'),'16000');assert.equal(meter.getAttribute('aria-valuenow'),'14000');
  assert.ok(allPc(root).some(n=>n.textContent==='Ёмкость 16,0 ГБ'));
  view.update(diskUsage(createVirtualPcState({download:{status:'installed'}})));
  assert.equal(allPc(root).find(n=>n.getAttribute('role')==='meter'),meter);
  assert.equal(meter.getAttribute('aria-valuenow'),'14800');
  assert.ok(allPc(root).some(n=>n.textContent==='Свободно 1,2 ГБ (1200 МБ)'));
  view.dispose();assert.equal(root.children.length,0);
});

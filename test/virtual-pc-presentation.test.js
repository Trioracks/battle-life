import test from 'node:test';
import assert from 'node:assert/strict';
import {PcTransition} from '../src/virtual-pc-transition.js';
const {pcPresentation}=await import('../src/virtual-pc-presentation.js').catch(()=>({}));
test('presentation follows controller and persistent room power',()=>{
 assert.equal(typeof pcPresentation,'function');
 const c=new PcTransition();assert.equal(pcPresentation(c.snapshot,'off').brightness,0);assert.equal(pcPresentation(c.snapshot,'on').screen,'desktop');
 c.enter();assert.equal(pcPresentation(c.snapshot,'on').screen,'bios');c.tick(3.6);assert.equal(pcPresentation(c.snapshot,'on').title,'Windows HP');c.tick(6);assert.equal(pcPresentation(c.snapshot,'on','Лёха').subtitle,'Лёха');
});
test('shutdown presentation outlives persisted power and fades before returning',()=>{
 assert.equal(typeof pcPresentation,'function');
 const c=new PcTransition();c.enter({alreadyOn:true});c.tick(2.4);c.shutdown();
 assert.equal(pcPresentation(c.snapshot,'off').screen,'shutdown');assert.equal(pcPresentation(c.snapshot,'off').brightness,1);
 c.tick(2.75);assert.equal(pcPresentation(c.snapshot,'off').brightness,.5);c.tick(.25);assert.equal(pcPresentation(c.snapshot,'off').brightness,0);
});

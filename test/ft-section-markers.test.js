import test from 'node:test';
import assert from 'node:assert/strict';
import {createStudioWorkspace,renderStudioTracks} from '../src/ft-studio-view.js';
import {createVocalTake} from '../src/vocal-result.js';
import {pcDocument,allPc} from './helpers/virtual-pc-dom.js';

const role=(root,name)=>allPc(root).find(node=>node.dataset.ftRole===name);
const markers=root=>allPc(root).filter(node=>node.dataset.ftRole==='section-marker');
const mixedBeat=()=>({version:3,id:'sections',stages:[{},{},{}],recording:{draft:createVocalTake({seed:15}),mix:{skill:10}}});

test('mixed song labels its intro, verse and outro above the bar ruler',()=>{
 const root=createStudioWorkspace(pcDocument()),beat=mixedBeat(),saved=JSON.stringify(beat);
 renderStudioTracks(root,beat);
 assert.deepEqual(markers(root).map(node=>[node.textContent,node.dataset.startBar,node.dataset.bars]),[
  ['Интро','1','2'],['Куплет','3','4'],['Аутро','7','2'],
 ]);
 const sections=role(root,'section-markers'),ruler=allPc(root).find(node=>node.className==='ft-timeline');
 assert.equal(sections.hidden,false);
 assert.equal(sections.parentElement,ruler.parentElement);
 assert.ok(sections.parentElement.children.indexOf(sections)<ruler.parentElement.children.indexOf(ruler));
 assert.equal(JSON.stringify(beat),saved,'visual labels do not mutate the saved arrangement');
});

test('loop projects have no sections and replacing a mixed song removes its markers',()=>{
 const root=createStudioWorkspace(pcDocument()),beat=mixedBeat();
 assert.equal(markers(root).length,0);
 renderStudioTracks(root,{...beat,recording:{...beat.recording,mix:null}});
 assert.equal(markers(root).length,0);
 renderStudioTracks(root,beat);assert.equal(markers(root).length,3);
 const playhead=role(root,'playhead');playhead.style.left='37.5%';
 renderStudioTracks(root,{...beat,recording:null});
 assert.equal(markers(root).length,0);assert.equal(role(root,'section-markers').hidden,true);
 assert.equal(role(root,'playhead'),playhead);assert.equal(playhead.style.left,'37.5%');
 renderStudioTracks(root,null);assert.equal(markers(root).length,0);
});

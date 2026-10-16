import test from 'node:test';
import assert from 'node:assert/strict';
import {createProfile,loadProfile,SAVE_KEY,normalizeAppearance,APPEARANCE_OPTIONS} from '../src/avatar-v3-profile.js';
import {readGlb} from './helpers/glb-pose.js';
const backup=SAVE_KEY+'-before-closed-footwear-v1';
function storage(raw,failKey){const data=new Map([[SAVE_KEY,raw]]);return {getItem:k=>data.get(k)??null,setItem(k,v){if(k===failKey)throw Error('quota');data.set(k,v);}};}
function legacy(onlyWardrobe=false){const p=createProfile({name:'Старый герой'});p.skills.beatmaking=63.25;p.appearance.footwear=onlyWardrobe?'sneakers':'flipflops';p.appearance.footwearColor='red';p.wardrobe.footwear=[{id:'flipflops',color:'red'},{id:'sandals',color:'blue'},{id:'sneakers',color:'red'},{id:'boots',color:'brown'}];p.inventory={cash:145};p.date='2012-09-12';return p;}
for(const onlyWardrobe of [false,true])test('load migrates '+(onlyWardrobe?'wardrobe-only':'worn and owned')+' footwear without losing progress or colors',()=>{
 const before=legacy(onlyWardrobe),raw=JSON.stringify(before),s=storage(raw),result=loadProfile(s);
 assert.equal(result.ok,true);assert.equal(result.profile.appearance.footwear,onlyWardrobe?'sneakers':'ankleboots');
 assert.deepEqual(result.profile.wardrobe.footwear,[{id:'ankleboots',color:'red'},{id:'highcanvas',color:'blue'},{id:'sneakers',color:'red'},{id:'boots',color:'brown'}]);
 assert.deepEqual(result.profile.skills,before.skills);assert.deepEqual(result.profile.inventory,before.inventory);assert.equal(result.profile.date,before.date);assert.equal(s.getItem(backup),raw);
 const once=s.getItem(SAVE_KEY);assert.deepEqual(loadProfile(s),result);assert.equal(s.getItem(SAVE_KEY),once);assert.equal(s.getItem(backup),raw);
});
for(const failKey of [backup,SAVE_KEY])test('footwear migration preserves raw save when '+failKey+' write fails',()=>{
 const raw=JSON.stringify(legacy(true)),s=storage(raw,failKey),result=loadProfile(s);assert.equal(result.ok,false);assert.match(result.error,/quota/);assert.equal(s.getItem(SAVE_KEY),raw);
});
test('version three aliases retain their shape and colors without novice reset',()=>{
 const p=legacy();p.version=3;delete p.noviceSchema;delete p.wardrobe;p.skills=Object.fromEntries(Object.keys(p.skills).map(k=>[k,10]));Object.assign(p.skills,{intelligence:50,writing:50,beatmaking:30});p.appearance.footwear='sandals';
 const result=loadProfile(storage(JSON.stringify(p)));assert.equal(result.ok,true);assert.equal(result.profile.version,3);assert.equal(result.profile.appearance.footwear,'highcanvas');assert.deepEqual(result.profile.skills,p.skills);
});
test('appearance aliases resolve to selectable closed models',()=>{assert.equal(normalizeAppearance({footwear:'flipflops'}).footwear,'ankleboots');assert.equal(normalizeAppearance({footwear:'sandals'}).footwear,'highcanvas');assert.deepEqual(APPEARANCE_OPTIONS.footwear.options.map(x=>x.id),['sneakers','canvas','boots','ankleboots','highcanvas']);});
test('all five exported shoes have closed tinted uppers and distinct boot heights, no hidden bare feet',()=>{
 const {json:g,values}=readGlb('mannequin.glb');const heights=[];
 for(const id of ['sneakers','canvas','boots','ankleboots','highcanvas']){
  const node=g.nodes.find(n=>n.name==='look-footwear-'+id);assert.ok(node,id+' exported');
  const parts=g.meshes[node.mesh].primitives,cloth=parts.filter(p=>g.materials[p.material].extras?.tintChannel==='footwear');assert.ok(cloth.length,id+' tint');
  const points=cloth.flatMap(p=>values(p.attributes.POSITION));assert.ok(points.some(p=>p[1]>.07&&p[2]>.12),id+' closed toe');heights.push(Math.max(...points.map(p=>p[1])));
 }
 assert.ok(heights[2]>heights[4]&&heights[4]>heights[3]&&heights[3]>heights[0],'different shaft heights');
 const body=g.nodes.find(n=>n.name==='neutral-skinned-body');const skin=g.meshes[body.mesh].primitives.flatMap(p=>values(p.attributes.POSITION));assert.ok(skin.every(p=>p[1]>=.09),'covered feet are not modelled as exposed skin');
});

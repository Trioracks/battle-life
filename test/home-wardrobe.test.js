import test from 'node:test';
import assert from 'node:assert/strict';
import {createProfile,DEFAULT_APPEARANCE,saveProfile,loadProfile} from '../src/avatar-v3-profile.js?rev=28';
import {ApartmentMotion} from '../src/apartment-v3-motion.js';
import {prepareApartmentConfig} from '../src/apartment-v3-runtime.js?rev=28';
import {pcDocument,allPc,fire} from './helpers/virtual-pc-dom.js';
import fs from 'node:fs';
import * as THREE from '../vendor/three/three.module.js';
const wardrobe=await import('../src/home-wardrobe.js?rev=28').catch(()=>({}));
const views=await import('../src/home-wardrobe-view.js?rev=28').catch(()=>({}));
test('new heroes start at zero without allocations and ignore old bonuses',()=>{
 const p=createProfile({name:'Новичок',allocations:{intelligence:999}});
 assert.deepEqual(Object.values(p.skills),Array(9).fill(0));assert.equal(p.version,4);assert.equal(p.noviceSchema,1);assert.equal(p.skillSchema,2);
 const records=new Map(),storage={setItem:(k,v)=>records.set(k,v),getItem:k=>records.get(k)??null};
 p.skills.beatmaking=14;assert.equal(saveProfile(storage,p).ok,true);assert.equal(loadProfile(storage).profile.skills.beatmaking,14);
});
test('ownership rejects unknown values and exact unowned garment colors; face is immutable',()=>{
 assert.equal(typeof wardrobe.canWear,'function');const p=createProfile({name:'Владелец'}),a=p.appearance;
 assert.equal(wardrobe.canWear(p,a),true);
 assert.equal(wardrobe.canWear({wardrobe:p.wardrobe},a),false,'malformed profile cannot crash ownership checks');
 for(const change of [{top:'hoodie'},{topColor:'red'},{hair:'messy'},{hair:'unknown'},{top:'unknown'},{face:'square'}]){assert.equal(wardrobe.canWear(p,{...a,...change}),false);assert.equal(wardrobe.wearAppearance(p,{...a,...change}).ok,false);}
 p.wardrobe.top.push({id:'hoodie',color:'red'});assert.equal(wardrobe.canWear(p,{...a,top:'hoodie',topColor:'red'}),true);assert.equal(wardrobe.canWear(p,{...a,top:'hoodie',topColor:'blue'}),false);
 const changed=wardrobe.wearAppearance(p,{...a,top:'hoodie',topColor:'red'});assert.equal(changed.profile.appearance.top,'hoodie');assert.equal(p.appearance.top,'tee');
});
test('failed apply keeps preview open and cancel restores original clothing',()=>{
 const doc=pcDocument(),root=doc.createElement('section'),previews=[],p=createProfile({name:'Отказ записи'});p.wardrobe.top.push({id:'hoodie',color:'red'});
 const view=views.mountHomeWardrobeView(root,{onPreview:a=>previews.push(a),onApply:()=>({ok:false,error:'storage denied'})});view.open(p);
 allPc(root).find(n=>n.dataset.category==='top'&&n.dataset.option==='hoodie:red').click();allPc(root).find(n=>n.textContent==='Применить').click();assert.equal(view.isOpen,true);assert.ok(allPc(root).some(n=>n.textContent==='storage denied'));
 allPc(root).find(n=>n.textContent==='Отмена').click();assert.deepEqual(previews.at(-1),DEFAULT_APPEARANCE);
});
test('wardrobe cancel restores actual appearance, locks callbacks, applies owned choice and traps focus',()=>{
 assert.equal(typeof views.mountHomeWardrobeView,'function');const doc=pcDocument(),root=doc.createElement('section'),focus=doc.createElement('canvas'),previews=[],applied=[];
 const p=createProfile({name:'Примерка'});p.wardrobe.top.push({id:'hoodie',color:'red'});
 const view=views.mountHomeWardrobeView(root,{onPreview:a=>previews.push(a),onApply:p=>{applied.push(p);return {ok:true};},returnFocus:focus});view.open(p);
 const category=allPc(root).find(n=>n.dataset.wardrobeCategory==='hair');assert.ok(category,'wardrobe offers compact category navigation');category.click();assert.equal(category.getAttribute('aria-pressed'),'true');
 allPc(root).find(n=>n.dataset.wardrobeCategory==='top').click();
 const button=(category,option)=>allPc(root).find(n=>n.dataset.category===category&&n.dataset.option===option);
 button('hair','messy').click();assert.equal(previews.length,0);button('top','hoodie:red').focus();button('top','hoodie:red').click();assert.equal(previews.at(-1).top,'hoodie');assert.equal(doc.activeElement,button('top','hoodie:red'));
 fire(root,'keydown',{key:'Escape'});assert.deepEqual(previews.at(-1),DEFAULT_APPEARANCE);assert.equal(doc.activeElement,focus);assert.equal(applied.length,0);
 view.open(p);button('top','hoodie:red').click();allPc(root).find(n=>n.textContent==='Применить').click();assert.equal(applied[0].appearance.top,'hoodie');assert.equal(view.isOpen,false);
});
test('distant wardrobe action uses the ordinary approach before starting',()=>{
 const config=prepareApartmentConfig(JSON.parse(fs.readFileSync(new URL('../assets/apartment/v3/scene.json',import.meta.url))));const motion=new ApartmentMotion(config);
 assert.equal(motion.interact('wardrobe'),true);assert.equal(motion.phase,'walk');assert.deepEqual(motion.drainEvents(),[]);for(let i=0;i<300;i++)motion.tick(.05);
 assert.equal(motion.actionId,'wardrobe');assert.equal(motion.phase,'perform');assert.ok(motion.drainEvents().some(e=>e.id==='wardrobe'&&e.type==='started'));
});
test('wardrobe hit volume remains reachable in front of its rendered doors and handles',()=>{
 const furniture=wardrobe.createWardrobeFurniture(THREE),action=wardrobe.wardrobeAction(),target=new THREE.Mesh(new THREE.BoxGeometry(...action.hit[1]),new THREE.MeshBasicMaterial());target.position.fromArray(action.hit[0]);target.updateMatrixWorld(true);furniture.updateMatrixWorld(true);
 for(const y of [1.5,1.12])for(const x of [6.6,6.68]){const ray=new THREE.Raycaster(new THREE.Vector3(x,y,5),new THREE.Vector3(0,0,-1));const surface=ray.intersectObject(furniture,true)[0],hit=ray.intersectObject(target)[0];assert.ok(hit.distance<=surface.distance+.025,'the ordinary scene blocker must not hide the wardrobe action');}
});

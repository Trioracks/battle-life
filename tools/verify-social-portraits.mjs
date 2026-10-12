import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core'),out='D:/Project/Battle/artifacts/v-krugu-qa';
await mkdir(out+'/browser-temp',{recursive:true});process.env.TEMP=process.env.TMP=out+'/browser-temp';
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}),page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.setDefaultTimeout(60000);page.on('pageerror',e=>{errors.push(e.message);console.log('PAGEERROR',e.stack);});
const base=process.env.BATTLE_QA_URL||'http://127.0.0.1:4175',key='battle-life-virtual-pc-v1';
try{
 await page.route('**/__portrait-live',r=>r.fulfill({contentType:'text/html',body:`<!doctype html><style>canvas{width:800px;height:600px}</style><script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/":"/vendor/three/addons/"}}</script><canvas></canvas><script type="module">
 import * as THREE from 'three';import {createApartmentScene} from '/src/apartment-v3-scene.js?rev=39';import {prepareApartmentConfig} from '/src/apartment-v3-runtime.js?rev=39';import {ApartmentMotion} from '/src/apartment-v3-motion.js?rev=39';
 const add=THREE.Scene.prototype.add;let live;THREE.Scene.prototype.add=function(...o){if(o.some(x=>x.name==='player'))live=this;return add.apply(this,o);};
 const config=prepareApartmentConfig(await(await fetch('/assets/apartment/v3/scene.json')).json());config.assetBase='/assets/apartment/v3/';const view=await createApartmentScene(document.querySelector('canvas'),config);THREE.Scene.prototype.add=add;
 const motion=new ApartmentMotion(config);motion.position=[...config.actions.computer.pose];motion.yaw=config.actions.computer.yaw;motion.actionId='computer';motion.phase='perform';motion.clip='seated';motion.fade=1;view.setComputerPresentation({phase:'working',workActor:true,zoom:0},{power:'on'},'Герой');view.setWorkCamera({kind:'beat',progress:.3});view.render(motion,.1,{instant:true});
 const snapshot=()=>{const rows=[];live.traverse(o=>rows.push([o.uuid,o.visible,o.position.toArray(),o.quaternion.toArray(),o.scale.toArray(),o.geometry?.uuid,(Array.isArray(o.material)?o.material:[o.material]).filter(Boolean).map(m=>[m.uuid,m.color?.getHex()]),o.skeleton?.bones.map(b=>b.uuid)]));return JSON.stringify(rows);};
 window.qa={view,snapshot,capture:look=>view.capturePlayerPortrait(look)};
 </script>`}));
 await page.goto(base+'/__portrait-live');await page.waitForFunction(()=>window.qa);
 const before=await page.evaluate(()=>qa.snapshot());
 for(const [id,appearance]of [['default',{}],['alternate',{hair:'bald',beard:'full',face:'square',top:'hoodie',topColor:'red'}]]){
  const r=await page.evaluate(look=>qa.capture(look),appearance);assert.equal(r.width,256);await writeFile(out+'/player-portrait-'+id+'.jpg',Buffer.from(r.url.split(',')[1],'base64'));assert.equal(await page.evaluate(()=>qa.snapshot()),before,'live scene mutated by capture');
 }
 await page.evaluate(()=>qa.view.dispose());
 await page.route('**/__portrait-seed',r=>r.fulfill({contentType:'text/html',body:'<!doctype html>'}));await page.goto(base+'/__portrait-seed');
 await page.evaluate(async()=>{const [{createProfile},{createVirtualPcState}]=await Promise.all([import('/src/avatar-v3-profile.js'),import('/src/virtual-pc-state.js')]);const profile=createProfile({name:'Портрет героя'});profile.wardrobe.hair.push('bald');localStorage.setItem('battle-life-apartment-v3',JSON.stringify(profile));localStorage.setItem('battle-life-virtual-pc-v1',JSON.stringify(createVirtualPcState({power:'on'})));localStorage.setItem('battle-life-apartment-v3-time',JSON.stringify({day:2,minutes:720,initialRest:false}));});
 await page.addInitScript(()=>{
  const context=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...rest){if(window.failPortrait&&this.id!=='apartment'&&kind.startsWith('webgl'))return null;return context.call(this,kind,...rest);};
  const save=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(window.quotaPortrait&&k==='battle-life-virtual-pc-v1'&&JSON.parse(v).social?.playerPortrait)throw new DOMException('Quota','QuotaExceededError');return save.call(this,k,v);};
 });
 await page.goto(base+'/?portrait-qa');await page.locator('#loading').waitFor({state:'hidden'});await page.evaluate(()=>window.failPortrait=true);await page.locator('#continue-game').click();await page.waitForFunction(()=>document.querySelector('#state').textContent.startsWith('idle'));
 assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).social.playerPortrait,key),null);
 await page.locator('#actions [data-action=computer]').click();await page.waitForFunction(()=>document.querySelector('#virtual-pc').dataset.pcTransition==='desktop');
 await page.getByRole('button',{name:'Слобода',exact:true}).click();await page.getByRole('menuitem',{name:'Underweb',exact:true}).click();
 const address=page.getByRole('textbox',{name:'Адрес или поиск Underweb'});await address.fill('underweb://social/me');await address.press('Enter');
 await page.getByRole('button',{name:'Повторить снимок',exact:true}).waitFor();await page.evaluate(()=>{window.failPortrait=false;window.quotaPortrait=true;});await page.getByRole('button',{name:'Повторить снимок',exact:true}).click();
 assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).social.playerPortrait,key),null);
 await page.evaluate(()=>window.quotaPortrait=false);await page.getByRole('button',{name:'Повторить снимок',exact:true}).click();await page.waitForFunction(k=>Boolean(JSON.parse(localStorage.getItem(k)).social.playerPortrait),key);
 assert.equal(await page.locator('.sn-profile-aside img').evaluate(n=>n.naturalWidth),256);await page.screenshot({path:out+'/player-profile-native.png'});
 const saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).social.playerPortrait,key);await page.reload();await page.locator('#loading').waitFor({state:'hidden'});await page.locator('#continue-game').click();assert.deepEqual(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).social.playerPortrait,key),saved);
 await page.waitForFunction(()=>document.querySelector('#state').textContent.startsWith('idle'));await page.locator('#actions [data-action=wardrobe]').click();const wardrobe=page.getByRole('dialog',{name:'Шкаф',exact:true});await wardrobe.getByRole('button',{name:'Волосы',exact:true}).click();await wardrobe.getByRole('button',{name:'Лысый',exact:true}).click();await wardrobe.getByRole('button',{name:'Применить',exact:true}).click();
 await page.waitForFunction(({key,old})=>JSON.parse(localStorage.getItem(key)).social.playerPortrait.key!==old,{key,old:saved.key});const changed=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).social.playerPortrait,key);assert.notEqual(changed.url,saved.url);
 assert.deepEqual(errors,[]);console.log('PASS live geometry/materials/camera/pose unchanged; 2 heroes; host failure/retry/quota/reload/wardrobe and profile image');
}catch(e){await page.screenshot({path:out+'/portrait-native-failure.png'});throw e;}finally{await browser.close();}

// Render the real apartment in an isolated fixture: no user save is read or written.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core');
const output=process.env.FT_QA_DIR||'D:/Codex/Builds/Battle/home-systems-20261010';await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
const errors=[],context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
try{
 await page.route('**/__switch-fixture',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><html><head><style>body{margin:0}canvas{display:block;width:100vw;height:100vh}</style><script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/":"/vendor/three/addons/"}}</script></head><body><canvas id="apartment"></canvas><script type="module">
 import * as THREE from 'three';
 import {createApartmentScene} from '/src/apartment-v3-scene.js?rev=28';
 import {prepareApartmentConfig} from '/src/apartment-v3-runtime.js?rev=31';
 import {ApartmentMotion} from '/src/apartment-v3-motion.js';
 const config=prepareApartmentConfig(await (await fetch('/assets/apartment/v3/scene.json')).json());config.assetBase='/assets/apartment/v3/';
 const view=await createApartmentScene(document.querySelector('canvas'),config),state=new ApartmentMotion(config);await view.loadMode('3D');
 window.switchFixture={async show({room,mode,minutes,on}){
  const x=config.actions['light-'+room].hit[0][0];state.position=[x+(mode==='2D'?-.65:0),0,mode==='2D'?.85:-.9];
  view.modes.mode=mode;view.modes.pitch=-.52;view.modes.yaw=0;view.setTime(minutes);view.setRoomLights({living:on,kitchen:on});view.render(state,0,{paused:true,instant:true});
  await new Promise(requestAnimationFrame);view.render(state,0,{paused:true,instant:true});
  let point;
  if(mode==='2D'){
   const camera=new THREE.OrthographicCamera(-4.1*1280/900/2,4.1*1280/900/2,4.1/2,-4.1/2,.1,80);camera.position.set(state.cameraX,1.35+12*Math.tan(8*Math.PI/180),12);camera.lookAt(state.cameraX,1.35,0);camera.updateMatrixWorld();
   const p=new THREE.Vector3(...config.actions['light-'+room].hit[0]).project(camera);point={x:(p.x+1)*640,y:(1-p.y)*450};
  }else{
   outer:for(let y=330;y<=600;y+=10)for(let x=550;x<=730;x+=10)if(view.pick({clientX:x,clientY:y}).id==='light-'+room){point={x,y};break outer;}
  }
  return {point,hit:point?view.pick({clientX:point.x,clientY:point.y}):null};
 },dispose:()=>view.dispose()};
 </script></body></html>`}));
 await page.goto('http://127.0.0.1:4173/__switch-fixture');await page.waitForFunction(()=>window.switchFixture);
 for(const room of ['living','kitchen'])for(const mode of ['2D','3D'])for(const [period,minutes] of [['day',720],['night',1410]])for(const on of [true,false]){
  const {point,hit}=await page.evaluate(options=>window.switchFixture.show(options),{room,mode,minutes,on});
  assert.equal(hit?.id,'light-'+room,room+' '+mode+' switch remains reachable with wardrobe present');
  const file=output+'/switch-'+room+'-'+mode.toLowerCase()+'-'+period+'-'+(on?'on':'off')+'.png';await page.screenshot({path:file});
  if(mode==='3D'&&room==='living')await page.screenshot({path:file.replace('.png','-detail.png'),clip:{x:480,y:300,width:320,height:320}});
  console.log('PASS '+room+' '+mode+' '+period+' '+(on?'on':'off')+' pick; '+file);
 }
 assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>localStorage.length),0,'fixture never creates a save');await page.evaluate(()=>window.switchFixture.dispose());console.log('PASS zero page errors; isolated storage untouched; scene disposed');
}finally{await context.close();await browser.close();}

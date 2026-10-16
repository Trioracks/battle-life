// Native WebGL evidence on a private server/context; never opens the player origin.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile,access} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve,extname,sep} from 'node:path';

const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'C:/Users/zubko/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const baseline=process.env.BEDROOM_QA_BASELINE==='1',out=resolve(process.env.SCENE_QA_DIR||'artifacts/dossier-weekplay/task-2/native'),port=Number(process.env.BEDROOM_QA_PORT||4194),base='http://127.0.0.1:'+port;
assert.ok(port>=4193&&port<=65535,'Use an isolated port at least 4193');
assert.match(out,/^[D-Z]:/i,'Native evidence and browser scratch must stay off C:');
assert.equal(await access(out+'/run.json').then(()=>true,()=>false),false,'Choose a fresh evidence directory');
await mkdir(out+'/browser-temp',{recursive:true});process.env.TEMP=process.env.TMP=out+'/browser-temp';
await writeFile(out+'/run.json',JSON.stringify({base,baseline,createdAt:new Date().toISOString()}));
const root=resolve('.'),mime={'.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.html':'text/html','.css':'text/css','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.wav':'audio/wav','.mp3':'audio/mpeg','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{try{
 const pathname=new URL(req.url,base).pathname,file=resolve(root,'.'+decodeURIComponent(pathname==='/'?'/index.html':pathname));
 if(!file.startsWith(root+sep)){res.writeHead(403).end();return;}
 const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);
}catch{res.writeHead(404).end();}});
const fixture=`<!doctype html><html><head><style>body{margin:0}canvas{display:block;width:100vw;height:100vh}</style><script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/":"/vendor/three/addons/"}}</script></head><body><canvas></canvas><script type="module">
 import * as THREE from 'three';
 import {createApartmentScene} from '/src/apartment-v3-scene.js';
 import {prepareApartmentConfig,advanceHomeFrame} from '/src/apartment-v3-runtime.js';
 import {ApartmentMotion} from '/src/apartment-v3-motion.js';
 import {ApartmentTime} from '/src/apartment-v3-time.js';
 let graph,camera;const add=THREE.Scene.prototype.add;
 THREE.Scene.prototype.add=function(...objects){if(objects.some(o=>o.name==='player')){graph=this;this.onBeforeRender=(_r,_s,view)=>camera=view;}return add.apply(this,objects);};
 const config=prepareApartmentConfig(await(await fetch('/assets/apartment/v3/scene.json')).json());config.assetBase='/assets/apartment/v3/';
 const view=await createApartmentScene(document.querySelector('canvas'),config);THREE.Scene.prototype.add=add;
 let motion,clock;
 const step=()=>{const frame=advanceHomeFrame(motion,clock,.05);for(const event of frame.events)view.modes.onMotionEvent(event);};
 const project=p=>new THREE.Vector3(...p).project(camera).toArray();
 window.bedroomQA={show(kind){
  motion=new ApartmentMotion(config);clock=new ApartmentTime({day:2,minutes:720,initialRest:kind==='initial'});view.modes.reset();
  if(kind==='initial'){motion.startSleeping();for(const event of motion.drainEvents())view.modes.onMotionEvent(event);}
  else{motion.interact('bed',kind==='manual'?{mode:'manual',minutesPerSecond:45}:null);for(let i=0;i<3000&&!(motion.sleeping&&motion.phase==='perform');i++)step();}
  if(!motion.sleeping)throw Error('Sleep fixture did not start');
  view.setTime(kind==='initial'?1410:720);view.render(motion,0,{paused:true,instant:true});
  return {kind,clip:motion.clip,phase:motion.phase,mode:view.modes.mode,cameraPosition:camera.position.toArray(),fov:camera.fov,bed:project([1.75,.8,-.8]),hero:project([.95,1.05,-.8]),desk:project([4.45,1.12,-.83]),kitchen:project([-.7,1,-.7]),crown:project([.12,2.94,-1.72]),roomTop:project([1.75,3,-1.72]),floorUnderside:project([1.75,-.12,1.82]),headEdge:project([.86,.79,-.65]),blanket:graph.getObjectByName('sleep-blanket').visible,meshes:graph.children.length};
 },dispose(){view.dispose();}};
 </script></body></html>`;
let browser;const errors=[],assets=[],results=[],screenshots=[];
try{
 await new Promise((yes,no)=>{server.once('error',no);server.listen(port,'127.0.0.1',yes);});
 browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const context=await browser.newContext({viewport:{width:1280,height:720},reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(90000);
 page.on('pageerror',error=>errors.push(error.message));page.on('response',response=>{if(/\.(glb|svg)(\?|$)/.test(response.url()))assets.push({url:new URL(response.url()).pathname,status:response.status(),mime:response.headers()['content-type']});});
 const shot=async name=>{const path=out+'/'+name+'.png';await page.screenshot({path});screenshots.push(path);console.log('SHOT '+path);};
 try{
  await page.route('**/__bedroom-qa',r=>r.fulfill({contentType:'text/html',body:fixture}));await page.goto(base+'/__bedroom-qa');await page.waitForFunction(()=>window.bedroomQA);
  const svg=await page.evaluate(async()=>{const path='/assets/ui/virtual-pc/icons/start.svg',response=await fetch(path),image=new Image();image.src=path;await image.decode();return {status:response.status,mime:response.headers.get('content-type'),width:image.naturalWidth};});
  assert.equal(svg.status,200);assert.match(svg.mime,/image\/svg\+xml/);assert.ok(svg.width>0);
  for(const [width,height] of baseline?[[1280,720]]:[[1280,720],[1366,768],[1920,1080],[640,900],[390,844]]){
   await page.setViewportSize({width,height});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   for(const kind of ['initial','manual','ordinary']){
    const result=await page.evaluate(kind=>bedroomQA.show(kind),kind);results.push({width,height,...result});await shot(kind+'-'+width+'x'+height);
    assert.equal(result.mode,'2D');assert.equal(result.blanket,true);
    if(!baseline){
     assert.ok(Math.abs(result.bed[0])<1&&Math.abs(result.hero[0])<1);
     if(width>=1280){assert.ok(result.bed[0]<0&&result.hero[0]<0&&result.desk[0]>0&&result.desk[0]<1);assert.ok(result.kitchen[0]<-1&&result.crown[0]<-1);}
     else{assert.ok(Math.abs(result.bed[0])<(width===640?.1:.35));assert.ok(result.roomTop[1]>1&&result.floorUnderside[1]<-1);assert.ok(Math.abs(result.headEdge[0])<.95);}
    }
   }
  }
  await page.evaluate(()=>bedroomQA.dispose());
 }finally{await context.close();}
 if(!baseline){
  const app=await browser.newContext({viewport:{width:1280,height:720},reducedMotion:'reduce'}),page=await app.newPage();page.setDefaultTimeout(90000);page.on('pageerror',error=>errors.push(error.message));
  const shot=async name=>{const path=out+'/app-'+name+'-1280x720.png';await page.screenshot({path});screenshots.push(path);console.log('SHOT '+path);};
  try{
   await page.route('**/__bedroom-seed',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Isolated bedroom save</title>'}));await page.goto(base+'/__bedroom-seed');
   await page.evaluate(async()=>{const {createProfile}=await import('/src/avatar-v3-profile.js');localStorage.setItem('battle-life-apartment-v3',JSON.stringify(createProfile({name:'Bedroom QA'})));localStorage.setItem('battle-life-apartment-v3-time',JSON.stringify({day:1,minutes:1410,initialRest:true}));});
   await page.goto(base);await page.locator('#loading').waitFor({state:'hidden'});await page.locator('#continue-game').click();await page.locator('#wake').waitFor({state:'visible'});await shot('initial');
   await page.locator('#wake').click();await page.waitForFunction(()=>document.querySelector('#wake').hidden&&!document.querySelector('#camera-mode').disabled);
   for(const kind of ['manual','ordinary']){
    await page.locator('#apartment').focus();await page.keyboard.press('Enter');await page.locator('#actions [data-action=bed]:not([data-sleep-mode])').click();
    await page.locator(kind==='manual'?'#actions [data-sleep-mode=manual]':'#actions [data-action=bed]:not([data-sleep-mode])').click();
    await page.locator('#wake').waitFor({state:'visible'});assert.equal(await page.locator('#wake').textContent(),kind==='manual'?'Проснуться':'Проснуться раньше');
    await shot(kind);await page.locator('#wake').click();await page.waitForFunction(()=>document.querySelector('#wake').hidden&&!document.querySelector('#camera-mode').disabled);
   }
  }finally{await app.close();}
 }
 assert.ok(assets.filter(a=>a.url.endsWith('.glb')).length>=4,'Native renderer decoded all four shipped GLBs');for(const asset of assets)assert.equal(asset.status,200,asset.url);assert.deepEqual(errors,[]);
 await writeFile(out+'/evidence.json',JSON.stringify({base,baseline,results,assets,screenshots,errors},null,2));console.log('PASS native bedroom framing; '+screenshots.length+' screenshots; '+out);
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}

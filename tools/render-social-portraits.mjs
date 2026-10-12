import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core');
const out='D:/Project/Battle/assets/social/photos',qa='D:/Project/Battle/artifacts/v-krugu-qa';await mkdir(out,{recursive:true});await mkdir(qa+'/browser-temp',{recursive:true});process.env.TEMP=process.env.TMP=qa+'/browser-temp';
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}),page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(60000);
try{
 await page.route('**/__portrait-render',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/":"/vendor/three/addons/"}}</script>'}));
 await page.goto((process.env.BATTLE_QA_URL||'http://127.0.0.1:4175')+'/__portrait-render');
 await page.evaluate(async()=>{
  const [{GLTFLoader},{renderAvatarPortrait,NPC_PORTRAITS},{normalizePlayerPortrait}]=await Promise.all([import('three/addons/loaders/GLTFLoader.js'),import('/src/avatar-portrait-renderer.js?rev=38'),import('/src/social-portraits.js?rev=38')]);
  const model=await new GLTFLoader().loadAsync('/assets/apartment/v3/mannequin.glb?portrait=1');window.qa={model,NPC_PORTRAITS,render:variant=>renderAvatarPortrait({variant,sceneAssets:{model}}),normalizePlayerPortrait};
 });
 const manifest={version:1,source:'src/avatar-portrait-renderer.js + assets/apartment/v3/mannequin.glb; original game geometry, no real people',files:[]};
 for(const id of ['anya','vitya','dasha'])for(const shot of ['avatar','01','02']){
  const result=await page.evaluate(variant=>qa.render(variant),id+':'+shot);assert.equal(await page.evaluate(url=>Boolean(qa.normalizePlayerPortrait({key:'portrait-v1:npc',url})),result.url),true);
  const bytes=Buffer.from(result.url.split(',')[1],'base64'),file=id+'-'+shot+'.jpg';assert.ok(bytes.length<96*1024);await writeFile(out+'/'+file,bytes);manifest.files.push({file,width:256,height:256,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
 }
 assert.equal(new Set(manifest.files.map(x=>x.sha256)).size,9);assert.deepEqual(errors,[]);await writeFile(out+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');console.log('PASS 9 unique 256px game-model portraits generated');
}finally{await browser.close();}

import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';

const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core');
const output=process.env.FT_QA_DIR||'D:/Codex/Builds/Battle/ft-section-markers';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
const close=(actual,expected,message)=>assert.ok(Math.abs(actual-expected)<1,message+': '+actual+' / '+expected);
await page.route('**/__ft-section-fixture',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/desktop-apps.css"><style>body{margin:0}#virtual-pc{height:760px}.ft-workspace{height:100%}</style><section id="virtual-pc"></section>'}));
try{
 await page.goto('http://127.0.0.1:4173/__ft-section-fixture');
 await page.evaluate(async()=>{
  const [{createStudioWorkspace,renderStudioTracks},{createVocalTake}]=await Promise.all([import('/src/ft-studio-view.js'),import('/src/vocal-result.js')]);
  window.renderStudioTracks=renderStudioTracks;window.workspace=createStudioWorkspace(document);
  window.beat={version:3,id:'section-qa',stages:[{},{},{}],recording:{draft:createVocalTake({seed:15}),mix:{skill:10}}};
  document.querySelector('#virtual-pc').append(workspace);renderStudioTracks(workspace,beat);
 });
 assert.deepEqual(await page.locator('[data-ft-role=section-marker]').allTextContents(),['Интро','Куплет','Аутро']);
 for(const width of [1280,640]){
  await page.setViewportSize({width,height:800});
  for(const scrollLeft of [0,120]){
   await page.locator('.ft-playlist-scroll').evaluate((node,x)=>node.scrollLeft=x,scrollLeft);
   if(width===640&&scrollLeft===120)assert.equal(await page.locator('.ft-playlist-scroll').evaluate(node=>node.scrollLeft),120,'narrow timeline actually scrolls horizontally');
   const geometry=await page.evaluate(()=>{
    const box=node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
    const ruler=document.querySelector('.ft-timeline'),lane=document.querySelector('[data-ft-role=lane]');
    return {ruler:box(ruler),bars:[...ruler.children].slice(1).map(box),lane:box(lane),markers:[...document.querySelectorAll('[data-ft-role=section-marker]')].map(node=>({...box(node),color:getComputedStyle(node).backgroundColor})),clips:[...document.querySelectorAll('[data-ft-role=clip]')].map(node=>({...box(node),start:Number(node.dataset.startBar),bars:Number(node.dataset.bars)}))};
   });
   for(const [index,start,bars] of [[0,0,2],[1,2,4],[2,6,2]]){
    const marker=geometry.markers[index];close(marker.x,geometry.bars[start].x,'marker starts on its bar');
    close(marker.width,geometry.lane.width*bars/16,'marker width matches its bar span');
    assert.ok(marker.y+marker.height<=geometry.ruler.y+.1,'markers sit above bar numbers');
   }
   assert.equal(new Set(geometry.markers.map(marker=>marker.color)).size,3,'sections use distinct colors');
   for(const clip of geometry.clips){close(clip.x,geometry.bars[clip.start-1].x,'clip aligns with ruler');close(clip.width,geometry.lane.width*clip.bars/16,'clip span matches ruler');}
   await page.locator('[data-ft-role=playhead]').evaluate(node=>node.style.left='37.5%');
   const playhead=await page.locator('[data-ft-role=playhead]').boundingBox();close(playhead.x,geometry.lane.x+geometry.lane.width*.375,'playhead keeps its bar coordinate');
  }
  await page.locator('.ft-playlist-scroll').evaluate(node=>node.scrollLeft=0);
  await page.screenshot({path:output+'/sections-'+width+'.png'});
 }
 const headerBefore=await page.locator('.ft-timeline-header').boundingBox();
 await page.locator('.ft-playlist-scroll').evaluate(node=>{node.style.maxHeight='200px';node.scrollTop=100;});
 assert.equal(await page.locator('.ft-playlist-scroll').evaluate(node=>node.scrollTop),100);
 const headerAfter=await page.locator('.ft-timeline-header').boundingBox();close(headerAfter.y,headerBefore.y,'section labels and ruler remain together during vertical scrolling');
 await page.evaluate(()=>{renderStudioTracks(workspace,{...beat,recording:{...beat.recording,mix:null}});});
 assert.equal(await page.locator('[data-ft-role=section-marker]').count(),0);
 assert.equal(await page.locator('[data-ft-role=section-markers]').isVisible(),false);
 assert.equal(await page.locator('[data-ft-role=playhead]').evaluate(node=>node.style.left),'37.5%');
 assert.deepEqual(errors,[]);
 console.log('PASS mixed section labels, 1–2 / 3–6 / 7–8 spans, ruler/clip alignment, 640/1280 horizontal scroll, sticky header, playhead coordinate, unmixed cleanup');
}finally{await browser.close();}

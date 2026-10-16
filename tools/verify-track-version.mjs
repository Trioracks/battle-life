// Native decode and frozen playback in a fresh browser context; no player save.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core');
const output=process.env.FT_QA_DIR||'D:/Codex/Builds/Battle/package-one';
await mkdir(output+'/browser-temp',{recursive:true});process.env.TEMP=process.env.TMP=output+'/browser-temp';
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.route('**/__track-version-qa',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Frozen audio QA</title>'}));
 await page.goto((process.env.BATTLE_QA_URL||'http://127.0.0.1:4175')+'/__track-version-qa');
 const result=await page.evaluate(async()=>{
  const [{submissionFixture},{captureTrackVersion},{playTrackVersion},{BeatAudio},{startVocalWork,advanceVocalWork}]=await Promise.all([
   import('/test/helpers/submission-fixtures.js'),import('/src/track-version.js?rev=43'),import('/src/track-version-audio.js?rev=43'),import('/src/beat-audio.js?rev=43'),import('/src/vocal-production.js?rev=43')]);
  let state=submissionFixture();
  for(const kind of ['mix','master']){
   state.music.needs={satiety:100,energy:100};
   state=advanceVocalWork(startVocalWork(state,{beatId:'beat',kind},{sound:40},()=>.6).state,1000).state;
  }
  const saved=captureTrackVersion(state,{projectId:'beat',nowMinute:700});
  if(!saved.ok)throw Error(saved.reason);
  const version=JSON.parse(JSON.stringify(saved.state.trackVersions.byId[saved.versionId])),before=JSON.stringify(version),audio=new BeatAudio();
  state.projects=[];
  const played=await playTrackVersion(audio,version);
  const buffers=audio.sources.map(source=>{const a=source.buffer.getChannelData(0);let sum=0;for(const x of a)sum+=x*x;return {frames:a.length,rms:Math.sqrt(sum/a.length)};});
  const report={played,unchanged:before===JSON.stringify(version),status:audio.status,duration:audio.descriptor.durationSeconds,buffers,qualities:version.qualities};
  audio.dispose();return report;
 });
 assert.equal(result.played.ok,true);assert.equal(result.unchanged,true);assert.equal(result.status,'playing');
 assert.ok(Math.abs(result.duration-64/3)<1e-6);assert.equal(result.buffers.length,4);
 assert.ok(result.buffers.every(b=>b.frames>100000&&b.rms>0));assert.deepEqual(errors,[]);
 console.log(JSON.stringify(result,null,2));console.log('PASS native saved-version decode, four audible sources, no projects, original recipe preserved');
}finally{await browser.close();}

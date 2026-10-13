import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core'),out=process.env.FT_QA_DIR||'D:/Project/Battle/artifacts/v-krugu-qa';
await mkdir(out+'/browser-temp',{recursive:true});process.env.TEMP=process.env.TMP=out+'/browser-temp';
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
try{
 const page=await browser.newPage();await page.route('**/__npc-audio-qa',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><title>NPC audio QA</title>'}));await page.goto((process.env.BATTLE_QA_URL||'http://127.0.0.1:4175')+'/__npc-audio-qa');
 const result=await page.evaluate(async()=>{
  const [{ensureNpcRoundTrack},{DEMO_PARTICIPANTS},{createVirtualPcState},{npcPlaybackDescriptor},{BeatAudio}]=await Promise.all([import('/src/battle-npc.js?rev=40'),import('/src/battle-demo-config.js?rev=40'),import('/src/virtual-pc-state.js?rev=40'),import('/src/battle-npc-audio.js?rev=40'),import('/src/beat-audio.js?rev=40')]);
  const r=ensureNpcRoundTrack(createVirtualPcState(),{characterId:DEMO_PARTICIPANTS[0].characterId,battleId:'makarevich-1',roundId:'selection',nowMinute:600});if(!r.ok)throw Error(r.reason);
  const saved=JSON.stringify(r.state),v=r.state.trackVersions.byId[r.trackVersionId],before=JSON.stringify(v),checks=[];
  for(const version of [v,createVirtualPcState(JSON.parse(saved)).trackVersions.byId[v.id]]){
   const resolved=npcPlaybackDescriptor(version),rate=22050,context=new OfflineAudioContext(2,rate*3,rate),audio=new BeatAudio();audio.context=context;audio.unlock=async()=>{};
   const played=await audio.playDescriptor(resolved.previewDescriptor);if(!played)throw Error(audio.error);
   const sources=audio.sources.length,rendered=await context.startRendering(),samples=rendered.getChannelData(0),rms=Math.sqrt(samples.reduce((n,x)=>n+x*x,0)/samples.length);checks.push({played,sources,rms,fullTrackAvailable:resolved.ok,missing:resolved.missingAssets});audio.stop();
  }
  return {checks,unchanged:JSON.stringify(v)===before};
 });
 for(const row of result.checks){assert.equal(row.played,true);assert.equal(row.fullTrackAvailable,false);assert.equal(row.sources,3);assert.ok(row.rms>.0001);assert.equal(row.missing[0].kind,'vocal');}
 assert.deepEqual(result.checks[0],result.checks[1]);assert.equal(result.unchanged,true);await writeFile(out+'/npc-audio-evidence.json',JSON.stringify(result,null,2));console.log('PASS actual NPC beat decoding/render, explicit missing voice, identical saved/reloaded PCM RMS',result.checks[0].rms);
}finally{await browser.close();}

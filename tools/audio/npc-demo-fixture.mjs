// Harness-only input fixture override. No production module or roster is edited.
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {registerHooks} from 'node:module';
import assert from 'node:assert/strict';
export function generateDemoFixture({characterId='mak-npc-29',demoSeed,roundId='selection'}={}){
 if(!Number.isSafeInteger(demoSeed)||demoSeed<0||demoSeed>4294967295)throw Error('Invalid demo seed');
 return new Promise((resolve,reject)=>{
  const worker=new Worker(new URL(import.meta.url),{workerData:{kind:'npc-demo-fixture',characterId,demoSeed,roundId},execArgv:process.execArgv.filter(arg=>!arg.startsWith('--input-type'))});
  worker.once('message',resolve);worker.once('error',reject);worker.once('exit',code=>{if(code!==0)reject(Error('Fixture worker exited '+code));});
 });
}
if(!isMainThread&&workerData?.kind==='npc-demo-fixture'){
 let originalFixture;
 registerHooks({load(url,context,nextLoad){
  const result=nextLoad(url,context);
  if(url.endsWith('/data/battles/demo-v2.json')){
   const config=JSON.parse(String(result.source)),fixture=config.participants.find(p=>p.characterId===workerData.characterId);
   assert.ok(fixture,'known canonical fixture');originalFixture=structuredClone(fixture);fixture.seed=workerData.demoSeed;
   return {...result,source:JSON.stringify(config)};
  }
  return result;
 }});
 const [{ensureNpcRoundTrack},{createVirtualPcState}]=await Promise.all([import('../../src/battle-npc.js'),import('../../src/virtual-pc-state.js')]);
 const args={characterId:workerData.characterId,battleId:'makarevich-1',roundId:workerData.roundId,nowMinute:600},result=ensureNpcRoundTrack(createVirtualPcState(),args);
 assert.equal(result.ok,true,result.reason);const version=result.state.trackVersions.byId[result.trackVersionId],again=ensureNpcRoundTrack(createVirtualPcState(JSON.parse(JSON.stringify(result.state))),args);
 assert.deepEqual(again.state.trackVersions.byId[result.trackVersionId],version);assert.deepEqual(again.state.npcTracks.voices,result.state.npcTracks.voices);
 parentPort.postMessage({kind:'DEMO ONLY: cloned canonical NPC input with reproducible seed variation; not an actual campaign event.',originalFixture,demoSeed:workerData.demoSeed,args,state:result.state,version,reloadEqual:true});
}

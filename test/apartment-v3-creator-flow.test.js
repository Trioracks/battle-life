import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_APPEARANCE,STAT_KEYS,createProfile} from '../src/avatar-v3-profile.js?rev=25';
const draft=()=>({name:'  Тест  ',appearance:{...DEFAULT_APPEARANCE,top:'hoodie',topColor:'red'},allocations:Object.fromEntries(STAT_KEYS.map((k,i)=>[k,i===0?2:1]))});
test('invalid name cannot save or enter; old allocation input no longer grants bonuses',async()=>{
 const {createCreatorSession}=await import('../src/apartment-v3-creator-session.js?rev=25');let writes=0,entries=0;
 const session=createCreatorSession(null,{setItem(){writes++;}},{enter(){entries++;},restore(){}});
 for(const change of [{name:'  '},{name:17}]){
  const result=session.submit({...draft(),...change});assert.equal(result.ok,false);assert.ok(Object.keys(result.errors).length);
 }
 assert.equal(writes,0);assert.equal(entries,0);
 const result=session.submit({...draft(),allocations:{intelligence:999}});assert.equal(result.ok,true);assert.equal(result.profile.name,'Тест');assert.equal(result.profile.version,4);assert.equal(entries,1);assert.deepEqual(Object.values(result.profile.skills),[10,10,10,10,10,10,10,10,10]);
});
test('repeated confirmation enters once, with the chosen wardrobe',async()=>{
 const {createCreatorSession}=await import('../src/apartment-v3-creator-session.js?rev=25');let writes=0;const entries=[];
 const session=createCreatorSession(null,{setItem(){writes++;}},{enter:p=>entries.push(p),restore(){}});
 session.submit(draft());session.submit(draft());assert.equal(writes,1);assert.equal(entries.length,1);assert.equal(entries[0].appearance.topColor,'red');
});
test('cancel restores the original appearance without writing; inaccessible storage still permits play',async()=>{
 const {createCreatorSession}=await import('../src/apartment-v3-creator-session.js?rev=25');const saved=createProfile(draft());let restored,entries=0;
 const cancel=createCreatorSession(saved,{setItem(){assert.fail('cancel must not write');}},{enter(){assert.fail('cancel must not enter');},restore:a=>restored=a});
 cancel.cancel();assert.deepEqual(restored,saved.appearance);assert.equal(cancel.submit(draft()).ok,false);
 const denied=createCreatorSession(saved,{setItem(){throw Error('denied');}},{enter(){entries++;},restore(){}});
 const result=denied.submit(draft());assert.equal(result.ok,true);assert.equal(result.saved,false);assert.ok(result.warning);assert.equal(entries,1);
});

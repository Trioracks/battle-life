import test from 'node:test';
import assert from 'node:assert/strict';
import * as food from '../src/home-food.js?rev=23';
import {createVirtualPcState,loadVirtualPcState,saveVirtualPcState,setPcPower,VIRTUAL_PC_STORAGE_KEY} from '../src/virtual-pc-state.js?rev=23';
const storage=(map=new Map())=>({getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value)});
test('fruit consumes one portion, caps satiety and preserves unrelated state',()=>{
 for(const [satiety,want]of [[50,80],[85,100]]){
  const state=createVirtualPcState({music:{needs:{satiety,energy:41},cash:123,practice:7},projects:[{id:'keep'}],lastGameMinute:88});
  const result=food.consumeFood(state,'apple');
  assert.equal(result.ok,true);assert.equal(result.state.music.needs.satiety,want);assert.equal(result.state.household.fridge.apple,0);
  assert.equal(state.household.fridge.apple,1);assert.equal(state.music.needs.satiety,satiety);
  assert.equal(result.state.music.needs.energy,41);assert.equal(result.state.music.cash,123);assert.equal(result.state.music.practice,7);assert.deepEqual(result.state.projects,[{id:'keep'}]);assert.equal(result.state.lastGameMinute,88);
 }
});
test('full, depleted, unknown and nonraw foods cannot spend a portion',()=>{
 const full=createVirtualPcState({music:{needs:{satiety:100}}});assert.equal(food.consumeFood(full,'apple').state,full);
 const state=createVirtualPcState({music:{needs:{satiety:50}}}),once=food.consumeFood(state,'apple').state;
 assert.equal(food.consumeFood(once,'apple').state,once);assert.equal(food.consumeFood(state,'missing').state,state);
 const catalog={...food.FOOD_CATALOG,apple:{...food.FOOD_CATALOG.apple,edibleRaw:false}};
 assert.equal(food.consumeFood(state,'apple',catalog).reason,'not-edible-raw');assert.equal(food.consumeFood(state,'apple',catalog).state,state);
});
test('missing household seeds once while explicit emptiness and invalid quantities never create food',()=>{
 assert.deepEqual(food.normalizeHousehold(),{fridge:{apple:1,pear:1,banana:1}});
 assert.deepEqual(food.normalizeHousehold({fridge:{}}),{fridge:{apple:0,pear:0,banana:0}});
 assert.deepEqual(food.normalizeHousehold({fridge:{apple:-1,pear:'2',banana:NaN,unknown:50}}),{fridge:{apple:0,pear:0,banana:0}});
 const store=storage(),empty=createVirtualPcState({household:{fridge:{}}});assert.equal(saveVirtualPcState(store,setPcPower(empty,'on')),true);
 assert.deepEqual(loadVirtualPcState(store).state.household,{fridge:{apple:0,pear:0,banana:0}});
 assert.ok(Object.isFrozen(food.FOOD_CATALOG.apple));assert.equal(food.FOOD_CATALOG.apple.ingredient,true);
});
test('legacy migration backs up original JSON and cannot overwrite it when backup fails',()=>{
 const raw=JSON.stringify({version:1,power:'off',projects:[{id:'legacy'}]}),map=new Map([[VIRTUAL_PC_STORAGE_KEY,raw]]),store=storage(map);
 const loaded=loadVirtualPcState(store);assert.equal(loaded.ok,true);assert.equal(map.get(VIRTUAL_PC_STORAGE_KEY+'-before-household'),raw);
 assert.equal(saveVirtualPcState(store,loaded.state),true);assert.deepEqual(loadVirtualPcState(store).state.household.fridge,{apple:1,pear:1,banana:1});
 const failMap=new Map([[VIRTUAL_PC_STORAGE_KEY,raw]]),blocked={getItem:key=>failMap.get(key)??null,setItem(key,value){if(key!==VIRTUAL_PC_STORAGE_KEY)throw Error('quota');failMap.set(key,value);}};
 const failed=loadVirtualPcState(blocked);assert.equal(failed.ok,false);assert.equal(failed.reason,'household-backup-failed');assert.equal(saveVirtualPcState(blocked,failed.state),false);assert.equal(failMap.get(VIRTUAL_PC_STORAGE_KEY),raw);
});
test('starting fresh can replace corrupt JSON as before without treating it as a legacy migration',()=>{
 const store=storage(new Map([[VIRTUAL_PC_STORAGE_KEY,'{broken']]));assert.equal(saveVirtualPcState(store,createVirtualPcState()),true);assert.equal(loadVirtualPcState(store).ok,true);
});

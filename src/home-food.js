export const FOOD_CATALOG = Object.freeze(Object.fromEntries([
 ['apple','Яблоко'],['pear','Груша'],['banana','Банан'],
 ['sausage','Колбаса'],['bread','Хлеб'],['cheese','Сыр'],
].map(([id,name])=>[id,Object.freeze({id,name,edibleRaw:true,ingredient:true,rawSatiety:30})])));
// Temporary playtesting switch. Stored quantities remain ready for finite food/cooking.
export const FOOD_TEST_MODE = Object.freeze({infiniteFood:true});
export function normalizeHousehold(value) {
 const missing=value===undefined;
 return {fridge:Object.fromEntries(Object.keys(FOOD_CATALOG).map(id=>{
  const count=value?.fridge?.[id];return [id,missing?1:Number.isSafeInteger(count)&&count>=0?count:0];
 }))};
}
// Optional catalog supports future foods; durable quantities always use the one fridge.
export function consumeFood(state,foodId,catalog=FOOD_CATALOG,{infiniteFood=FOOD_TEST_MODE.infiniteFood}={}) {
 const item=Object.hasOwn(catalog,foodId)?catalog[foodId]:null;
 const refuse=reason=>({ok:false,reason,state});
 if(!item)return refuse('unknown-food');
 if(!item.edibleRaw)return refuse('not-edible-raw');
 const satiety=state.music?.needs?.satiety;
 if(!Number.isFinite(satiety)||!Number.isFinite(item.rawSatiety)||item.rawSatiety<=0)return refuse('invalid-needs');
 if(satiety>=100)return refuse('full');
 const household=normalizeHousehold(state.household);
 if(!infiniteFood&&!(household.fridge[foodId]>0))return refuse('empty');
 return {ok:true,reason:'',state:{...state,household:infiniteFood?household:{fridge:{...household.fridge,[foodId]:household.fridge[foodId]-1}},music:{...state.music,needs:{...state.music.needs,satiety:Math.min(100,satiety+item.rawSatiety)}}}};
}

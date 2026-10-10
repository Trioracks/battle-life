export const FOOD_CATALOG = Object.freeze(Object.fromEntries([
 ['apple','Яблоко'],['pear','Груша'],['banana','Банан'],
].map(([id,name])=>[id,Object.freeze({id,name,edibleRaw:true,ingredient:true,rawSatiety:30})])));
export function normalizeHousehold(value) {
 const missing=value===undefined;
 return {fridge:Object.fromEntries(Object.keys(FOOD_CATALOG).map(id=>{
  const count=value?.fridge?.[id];return [id,missing?1:Number.isSafeInteger(count)&&count>=0?count:0];
 }))};
}
// Optional catalog supports future foods; durable quantities always use the one fridge.
export function consumeFood(state,foodId,catalog=FOOD_CATALOG) {
 const item=Object.hasOwn(catalog,foodId)?catalog[foodId]:null;
 const refuse=reason=>({ok:false,reason,state});
 if(!item)return refuse('unknown-food');
 if(!item.edibleRaw)return refuse('not-edible-raw');
 const satiety=state.music?.needs?.satiety;
 if(!Number.isFinite(satiety)||!Number.isFinite(item.rawSatiety)||item.rawSatiety<=0)return refuse('invalid-needs');
 if(satiety>=100)return refuse('full');
 const household=normalizeHousehold(state.household);
 if(!(household.fridge[foodId]>0))return refuse('empty');
 return {ok:true,reason:'',state:{...state,household:{fridge:{...household.fridge,[foodId]:household.fridge[foodId]-1}},music:{...state.music,needs:{...state.music.needs,satiety:Math.min(100,satiety+item.rawSatiety)}}}};
}

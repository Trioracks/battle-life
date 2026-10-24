import {voiceCatalog} from './vocal-catalog.js?rev=61';
export const voiceBagSeed=value=>{let h=2166136261;for(const c of String(value))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;};
const equal=(a,b)=>a.length===b.length&&a.every((id,i)=>id===b[i]);
export function shuffledVoiceOrder(catalog,seed,cycle,previous){
 const order=catalog.parts.map(p=>p.id);let x=voiceBagSeed(seed+':'+cycle);
 const random=()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};
 for(let i=order.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
 if(previous&&order.length>1&&order[0]===previous.lastId)[order[0],order[1]]=[order[1],order[0]];
 if(previous&&order.length>2&&equal(order,previous.order))[order[1],order[2]]=[order[2],order[1]];
 return order;
}
function migratedStart(source,sourceCatalog,targetCatalog){
 const byId=new Map(sourceCatalog.parts.map(p=>[p.id,p]));
 const consumed=new Set(source.order.slice(0,source.cursor).map(id=>byId.get(id)?.sha256).filter(Boolean));
 const order=shuffledVoiceOrder(targetCatalog,source.seed,0),targetById=new Map(targetCatalog.parts.map(p=>[p.id,p]));
 const used=order.filter(id=>consumed.has(targetById.get(id)?.sha256)),remaining=order.filter(id=>!consumed.has(targetById.get(id)?.sha256));
 const lastHash=byId.get(source.lastId)?.sha256;
 if(!used.length&&remaining.length>1&&lastHash===targetById.get(remaining[0])?.sha256){const next=remaining.findIndex(id=>targetById.get(id)?.sha256!==lastHash);if(next>0)[remaining[0],remaining[next]]=[remaining[next],remaining[0]];}
 return {order:[...used,...remaining],cursor:used.length,lastId:used.at(-1)??null};
}
export function validVoiceBag(item,catalog=voiceCatalog(item?.voiceId,item?.catalogVersion??1),historicalCatalog=null){
 if(!item||!catalog||!catalog.parts.length||(item.catalogVersion!==undefined&&item.catalogVersion!==catalog.version))return false;
 const ids=catalog.parts.map(p=>p.id),permutation=order=>Array.isArray(order)&&order.length===ids.length&&new Set(order).size===ids.length&&order.every(id=>ids.includes(id));
 if(!(Number.isInteger(item.seed)&&item.seed>=0&&item.seed<=4294967295&&Number.isSafeInteger(item.cycle)&&item.cycle>=0&&item.cycle<1000000&&Number.isInteger(item.cursor)&&item.cursor>=0&&item.cursor<=ids.length&&permutation(item.order)&&(item.cursor===0?item.lastId===null:item.lastId===item.order[item.cursor-1])))return false;
 if(item.migration!==undefined){
  const source=item.migration,old=historicalCatalog??voiceCatalog(item.voiceId,source?.catalogVersion??1);
  if(item.cycle!==0||item.seed!==source?.seed||source?.migration!==undefined||source?.voiceId!==item.voiceId||!old||old.version!==(source.catalogVersion??1)||old.version>=catalog.version||!validVoiceBag(source,old))return false;
  const start=migratedStart(source,old,catalog);
  return item.cursor>=start.cursor&&equal(start.order,item.order);
 }
 if(item.cycle>0&&!permutation(item.previousOrder))return false;
 const previous=item.cycle>0?{order:item.previousOrder,lastId:item.previousOrder.at(-1)}:undefined;
 return equal(shuffledVoiceOrder(catalog,item.seed,item.cycle,previous),item.order);
}
const failure=bag=>({ok:false,bag:structuredClone(bag),changed:false,reason:'История голоса повреждена. Миграция запрещена.'});
// Explicit catalogs make the transformation usable independently of runtime registries.
export function migrateVoiceBagCatalogs(bag,{voiceId,sourceCatalog,targetCatalog}){
 if(bag?.voiceId===voiceId&&targetCatalog&&(bag.catalogVersion??1)===targetCatalog.version&&validVoiceBag(bag,targetCatalog,bag.migration?sourceCatalog:null))return {ok:true,bag:structuredClone(bag),changed:false,reason:''};
 if(bag?.voiceId!==voiceId||!sourceCatalog||!targetCatalog||(bag.catalogVersion??1)!==sourceCatalog.version||!validVoiceBag(bag,sourceCatalog)||sourceCatalog.version>targetCatalog.version)return failure(bag);
 if(sourceCatalog.version===targetCatalog.version)return {ok:true,bag:structuredClone(bag),changed:false,reason:''};
 const start=migratedStart(bag,sourceCatalog,targetCatalog);
 return {ok:true,bag:{voiceId,catalogVersion:targetCatalog.version,seed:bag.seed,cycle:0,...start,migration:structuredClone(bag)},changed:true,reason:''};
}
export function migrateVoiceBag(bag,{voiceId,targetVersion}){
 return migrateVoiceBagCatalogs(bag,{voiceId,sourceCatalog:voiceCatalog(voiceId,bag?.catalogVersion??1),targetCatalog:voiceCatalog(voiceId,targetVersion)});
}

import catalogData from '../data/references/catalog.json' with {type:'json'};
import knowledgeData from '../data/references/judge-knowledge.json' with {type:'json'};

export const REFERENCE_CATALOG=Object.freeze(catalogData.map(r=>Object.freeze({...r,themes:Object.freeze(r.themes),uses:Object.freeze(r.uses)})));
export const STARTING_REFERENCE_TOPICS=Object.freeze(['games','animation','internet','everyday']);
const date=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
function hash(value){let h=2166136261;for(const c of String(value))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
function random(seed){let x=hash(seed);return()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};}

/** Knowledge is a fictional game configuration, not a claim about a real judge. */
export function judgeReferenceKnowledge(id){
 return structuredClone(Object.hasOwn(knowledgeData,id)?knowledgeData[id]:{version:2,status:'fictional_game_configuration',topics:[],sourceIds:[]});
}

export function availableReferences({gameDate,knownTopics=[],theme}={},catalog=REFERENCE_CATALOG){
 if(!date(gameDate)||!Array.isArray(knownTopics))return [];
 return catalog.filter(r=>date(r.availableFrom)&&r.availableFrom<=gameDate&&knownTopics.includes(r.group)&&r.themes.includes(theme));
}

export function chooseTrackReferences({seed=0,gameDate,knownTopics=[],theme,history=[],limit=1}={},catalog=REFERENCE_CATALOG){
 const previous=(Array.isArray(history)?history:[]).slice(-50).map(work=>({referenceIds:[...new Set((work?.referenceIds??[]).filter(id=>typeof id==='string'))]}));
 const counts=new Map();for(const work of previous)for(const id of work.referenceIds)counts.set(id,(counts.get(id)||0)+1);
 const rng=random(seed),pool=availableReferences({gameDate,knownTopics,theme},catalog).filter(r=>(counts.get(r.id)||0)<2).sort((a,b)=>a.id.localeCompare(b.id));
 const uses=[],sourceIds=new Set(),size=Math.max(0,Math.min(2,Math.floor(Number.isFinite(limit)?limit:1)));
 while(pool.length&&uses.length<size){
  const r=pool.splice(Math.floor(rng()*pool.length),1)[0];if(sourceIds.has(r.sourceId))continue;sourceIds.add(r.sourceId);
  uses.push({referenceId:r.id,sourceId:r.sourceId,fit:Number((.45+.55*rng()).toFixed(3)),clarity:Number((r.obviousness*(.65+.35*rng())).toFixed(3)),placement:uses.length?'ending':'body',origin:'production-simulation'});
 }
 return {uses,history:[...previous,{referenceIds:uses.map(r=>r.referenceId)}].slice(-50)};
}

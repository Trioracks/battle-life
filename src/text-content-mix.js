// Artistic attention is a conserved budget, never an additional quality score.
export const CONTENT_MIX_KEYS=Object.freeze(['topic','diss','lyric']);
export const CONTENT_POLICY_VERSION=2;
export function normalizeContentMix(value){
 if(!value||Array.isArray(value)||!CONTENT_MIX_KEYS.every(k=>Number.isFinite(value[k])&&value[k]>=0&&value[k]<=100))return null;
 if(Math.abs(CONTENT_MIX_KEYS.reduce((n,k)=>n+value[k],0)-100)>1e-9)return null;
 return Object.fromEntries(CONTENT_MIX_KEYS.map(k=>[k,value[k]]));
}
export function redistributeContentMix(value,{key,value:requested,step=10}={}){
 const mix=normalizeContentMix(value);
 if(!mix||!CONTENT_MIX_KEYS.includes(key)||!Number.isFinite(requested)||!Number.isInteger(step)||step<1||100%step)return null;
 const fixed=Math.round(Math.max(0,Math.min(100,requested))/step)*step,others=CONTENT_MIX_KEYS.filter(k=>k!==key),units=(100-fixed)/step,total=others.reduce((n,k)=>n+mix[k],0);
 const shares=others.map(k=>({key:k,exact:units*(total?mix[k]/total:1/others.length)}));
 for(const s of shares)s.units=Math.floor(s.exact);
 let remainder=units-shares.reduce((n,s)=>n+s.units,0);
 for(const s of [...shares].sort((a,b)=>(b.exact-b.units)-(a.exact-a.units)))if(remainder-->0)s.units++;
 return Object.fromEntries(CONTENT_MIX_KEYS.map(k=>[k,k===key?fixed:shares.find(s=>s.key===k).units*step]));
}
export function createAutomaticContentMix(seed,policy={step:10}){
 const step=policy.step??10;if(step!==10)throw new RangeError('Content policy v2 requires ten-percent steps');
 let x=Number(seed)>>>0;x=Math.imul(x^(x>>>16),0x21f0aaad);x=Math.imul(x^(x>>>15),0x735a2d97);x=(x^(x>>>15))>>>0;
 let index=Math.floor(x/4294967296*66);
 for(let topic=0;topic<=10;topic++)for(let diss=0;diss<=10-topic;diss++)if(index--===0)return {topic:topic*10,diss:diss*10,lyric:(10-topic-diss)*10};
}
export function textMixRetention(actual,preferred,sensitivity=0){
 const a=normalizeContentMix(actual),p=normalizeContentMix(preferred);
 if(!a||!p)return 1;
 const strength=Number.isFinite(sensitivity)?Math.max(0,Math.min(1,sensitivity)):0;
 return Math.max(0,1-strength*CONTENT_MIX_KEYS.reduce((sum,k)=>sum+Math.abs(a[k]-p[k]),0)/200);
}

import {SOFTWARE} from './pc-software-catalog.js?rev=41';
import {normalizeSoftware,softwareDiskBytes,withSoftware} from './pc-software.js?rev=41';
export const TRANSFER_RATES=Object.freeze([24,31,37,28,35,26]);
const periodBytes=TRANSFER_RATES.reduce((n,r)=>n+r*60000,0);
function integral(minute){const periods=Math.floor(minute/6),rest=minute-periods*6,whole=Math.floor(rest);return periods*periodBytes+TRANSFER_RATES.slice(0,whole).reduce((n,r)=>n+r*60000,0)+(rest-whole)*TRANSFER_RATES[whole]*60000;}
// Integrate the periodic channel once; allocation only changes when a file or disk
// completes. At most three iterations, even across years of game time.
export function advanceTransfers(input,fromMinute,toMinute){
 const s=withSoftware(input,normalizeSoftware(input.software,input.download)),soft=s.software;
 if(s.power!=='on'||!Number.isFinite(fromMinute)||!Number.isFinite(toMinute)||fromMinute<0||toMinute<=fromMinute)return {state:s,advancedBytes:0};
 let available=Math.max(0,integral(toMinute)-integral(fromMinute)),free=softwareDiskBytes(s).free,advancedBytes=0;
 while(available>1e-6){
  const ids=Object.keys(soft.transfers).filter(id=>!soft.transfers[id].paused&&!soft.transfers[id].error);
  if(!ids.length)break;
  if(free<=1e-6){for(const id of ids)soft.transfers[id].error='insufficient-space';break;}
  const nearest=Math.min(...ids.map(id=>SOFTWARE[id].downloadBytes-soft[id].receivedBytes));
  const budget=Math.min(available,free,nearest*ids.length),share=budget/ids.length;
  for(const id of ids){soft[id].receivedBytes+=share;if(SOFTWARE[id].downloadBytes-soft[id].receivedBytes<1e-6){soft[id].receivedBytes=SOFTWARE[id].downloadBytes;delete soft.transfers[id];}}
  available-=budget;free-=budget;advancedBytes+=budget;
  if(free<=1e-6)for(const id of ids)if(soft.transfers[id])soft.transfers[id].error='insufficient-space';
 }
 return {state:withSoftware(s,soft),advancedBytes};
}

import {advanceSocial} from './social-runtime.js?rev=40';
import {preparePcSaveArchives} from './virtual-pc-state.js?rev=40';
import {SOCIAL_DOMAIN_KEYS} from './social-background.js';

// Lives in a Worker. All history traversal, validation and large compression
// stays here; the main thread receives only changed sections and prepared saves.
export function createSocialWorkerRuntime(){
 let mirror={},prepared=new Map();
 return ({id,patch,nowMinute,options})=>{
  try{
   mirror={...mirror,...patch};const input=mirror,result=advanceSocial(input,nowMinute,options);
   if(result.reason)throw Error(result.reason);
   const changed={},archives=[];
   for(const key of SOCIAL_DOMAIN_KEYS){
    const value=result.state[key];
    if(value!==input[key]&&JSON.stringify(value)!==JSON.stringify(input[key]))changed[key]=value;
   }
   for(const key of ['trackVersions','judging']){
    const value=result.state[key];if(prepared.get(key)===value)continue;
    // Archive refs can change through normalized UI actions. Preparing them here
    // also primes the first autosave after loading an existing large campaign.
    const [entry]=preparePcSaveArchives(result.state,[key]);archives.push(entry);changed[key]=entry.value;prepared.set(key,entry.value);
   }
   mirror={...result.state,...changed};
   return {id,patch:changed,archives,durable:Boolean(result.events?.length||result.domainChanged||Object.hasOwn(changed,'battleSubmissions'))};
  }catch(error){return {id,error:error.message||String(error)};}
 };
}

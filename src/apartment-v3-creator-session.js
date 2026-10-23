import {createProfile,saveProfile,DEFAULT_APPEARANCE} from './avatar-v3-profile.js?rev=58';
import {normalizeVoiceId} from './vocal-catalog.js?rev=58';

export function validateCreatorDraft(draft){
 try{normalizeVoiceId(draft?.voiceId);}catch(error){return {ok:false,errors:{voiceId:error.message}};}
 try{return {ok:true,profile:createProfile(draft),errors:{}};}
 catch(error){return {ok:false,errors:{name:error.message}};}
}

export function createCreatorSession(savedProfile,storage,{enter,restore}){
 const original={...(savedProfile?.appearance??DEFAULT_APPEARANCE)};let closed=false;
 return {
  submit(draft){
   if(closed)return {ok:false,closed:true,errors:{}};
   const result=validateCreatorDraft(draft);if(!result.ok)return result;
   closed=true;
   const saved=saveProfile(storage,result.profile);enter(result.profile);
   return {...result,saved:saved.ok,warning:saved.ok?'':saved.error};
  },
  cancel(){if(closed)return false;closed=true;restore({...original});return true;}
 };
}

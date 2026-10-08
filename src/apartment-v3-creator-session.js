import {createProfile,saveProfile,DEFAULT_APPEARANCE} from './avatar-v3-profile.js?rev=10';

export function validateCreatorDraft(draft){
 try{return {ok:true,profile:createProfile(draft),errors:{}};}
 catch(error){const name=typeof draft?.name==='string'&&draft.name.trim();return {ok:false,errors:{[name?'allocations':'name']:error.message}};}
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

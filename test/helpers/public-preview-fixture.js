import {savePcDocument} from '../../src/pc-filesystem.js';
import {createProfile} from '../../src/avatar-v3-profile.js';
import {createVirtualPcState} from '../../src/virtual-pc-state.js';
import {createBeat} from '../../src/beat-production.js';
import {createLyric} from '../../src/lyric-production.js';
import {submissionFixture} from './submission-fixtures.js';

// Node-only preparation. The browser receives JSON, never test imports or hooks.
// Each precondition is loaded once in a fresh context; subsequent actions use UI.
export function publicPreviewFixture(kind){
 const profile=createProfile({name:'Preview acceptance'});
 let state=kind==='vocal'?submissionFixture({vocal:false}):createVirtualPcState({power:'on'});
 for(const id of ['client','ft','notebook','dossier'])state.software[id].installed=true;
 state.music.needs={satiety:100,energy:100};
 if(kind==='installer'){state.software.ft.installed=false;state.software.ft.receivedBytes=800000000;}
 if(kind==='beat'||kind==='lyrics'){
  const result=(kind==='beat'?createBeat:createLyric)(state,{id:'preview-'+kind,name:'Preview '+kind,battleId:'makarevich-1',gameDay:1},profile.skills,()=>.4);
  if(!result.ok)throw Error(result.reason);state=result.state;
 }
 if(!['installer','beat','lyrics','vocal'].includes(kind))throw Error('Unknown preview fixture');
 if(kind==='beat'||kind==='vocal'){const r=savePcDocument(state,{projectId:kind==='beat'?'preview-beat':'beat',folderId:'projects',filename:kind==='beat'?'Preview beat.flp':'Работа.flp',nowMinute:600});if(!r.ok)throw Error(r.reason);state=r.state;}
 state.lastGameMinute=600;
 return {'battle-life-apartment-v3':JSON.stringify(profile),'battle-life-virtual-pc-v1':JSON.stringify(state),'battle-life-apartment-v3-time':JSON.stringify({day:1,minutes:600,initialRest:false})};
}

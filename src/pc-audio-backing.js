import {drumById} from './beat-catalog.js?rev=61';
import {beginnerById} from './beat-beginner-bank.js?rev=61';
import {vocalById,DEFAULT_VOICE_ID} from './vocal-catalog.js?rev=61';
import {validBeatExecutionDescriptor} from './beat-execution-snapshot.js?rev=61';
const finiteJson=v=>typeof v==='number'?Number.isFinite(v):Array.isArray(v)?v.every(finiteJson):v&&typeof v==='object'?Object.values(v).every(finiteJson):true;
export function normalizeAudioBacking(raw){
 const d=raw?.descriptor;
 if(raw?.version!==1||typeof raw.fileId!=='string'||typeof raw.filename!=='string'||!d||!finiteJson(d)||!validBeatExecutionDescriptor(d)||typeof d.key!=='string'||!Number.isFinite(d.durationSeconds)||d.durationSeconds<=0||d.durationSeconds>36000||!Array.isArray(d.parts)||!d.parts.length)return null;
 if(!d.parts.every(p=>p&&typeof p.id==='string'&&!drumById(p.id)?.retired&&(['primitive','melody','bass'].includes(p.id)||beginnerById(p.id)||drumById(p.id)||vocalById(p.id))&&Number.isFinite(p.loopSeconds)&&p.loopSeconds>0&&(!vocalById(p.id)||p.vocal&&vocalById(p.id).voiceId===(p.voiceId??DEFAULT_VOICE_ID))&&(p.windows===undefined||Array.isArray(p.windows)&&p.windows.length&&p.windows.every(w=>Number.isFinite(w.startBar)&&w.startBar>=0&&Number.isFinite(w.bars)&&w.bars>0&&Number.isFinite(w.sourceBar)&&w.sourceBar>=0))))return null;
 return {version:1,fileId:raw.fileId,filename:raw.filename,descriptor:structuredClone(d)};
}

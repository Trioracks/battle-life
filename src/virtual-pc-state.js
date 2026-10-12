import {normalizeMusic,normalizeBeat} from './beat-production.js?rev=39';
import {normalizeWriting,normalizeLyric} from './lyric-production.js?rev=39';
import {normalizeCreativeWork} from './creative-workflow.js?rev=39';
import {normalizeBattleSubmissions} from './battle-submission.js?rev=39';
import {normalizeRecordingState} from './vocal-production.js?rev=39';
import {normalizeTrackVersions,captureTrackVersion} from './track-version.js?rev=39';
import {normalizeSocial} from './social-state.js?rev=39';
import {normalizeOutgoingUpload} from './social-upload.js?rev=39';
import {normalizeOutgoingMessage} from './social-composer.js?rev=39';
import {normalizeBattleWindows} from './battle-windows.js?rev=39';
import {normalizeSocialRuntime,normalizeCommunityAudio} from './social-runtime.js?rev=39';
import {normalizePhone} from './phone-notifications.js?rev=39';
import {normalizeBattleKnowledge} from './battle-knowledge.js?rev=39';
import {normalizeJudging} from './judge-comments.js?rev=39';
import {normalizeJudgingSchedule} from './social-judging-events.js?rev=39';
import {normalizeResultReactions} from './social-result-reaction.js?rev=39';
import {normalizeNpcTracks} from './battle-npc.js?rev=39';
import {normalizeTournaments} from './battle-tournament.js?rev=39';
import {normalizeBattleHistory} from './battle-history.js?rev=39';
import {encodePcSave,decodePcSave} from './pc-save-codec.js?rev=39';
import {drumById} from './beat-catalog.js?rev=39';
import {normalizeCommunity} from './underweb-community.js?rev=39';
import {BATTLE_BRIEFS} from './virtual-pc-catalog.js?rev=39';
import {normalizeHousehold} from './home-food.js?rev=39';
import {normalizeSoftware,withSoftware,softwareDiskBytes,openMetadata,cancelTransfer,advanceInstaller} from './pc-software.js?rev=39';
export const VIRTUAL_PC_STORAGE_KEY = 'battle-life-virtual-pc-v1';
export const VIRTUAL_DISK_MB = 16000;
export const SYSTEM_RESERVED_MB = 14000;
export const FT_STUDIO_BYTES = 800000000;
export const FT_STUDIO_MB = FT_STUDIO_BYTES / 1000000;
export const PROJECT_MB = 2;
const battleIds=new Set(BATTLE_BRIEFS.map(b=>b.id));
function normalizeApplications(value){
 const seen=new Set();return (Array.isArray(value)?value:[]).filter(a=>a&&battleIds.has(a.battleId)&&typeof a.nickname==='string'&&a.nickname.trim()&&!seen.has(a.battleId)&&seen.add(a.battleId)).map(a=>({battleId:a.battleId,nickname:a.nickname.trim().slice(0,32),status:'registered'}));
}
export function applyToBattle(state,battleId,nickname){
 const normalized=normalizeSnapshot(state);
 const application=normalizeApplications([{battleId,nickname}])[0];
 if(!application||normalized.battleApplications.some(a=>a.battleId===battleId))return normalized;
 return {...normalized,battleApplications:[...normalized.battleApplications,application]};
}

const wallpaperIds = new Set(['courtyard', 'factory', 'room']);
const downloadStates = new Set(['idle', 'downloading', 'ready-to-install', 'installed']);
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const clone = value => JSON.parse(JSON.stringify(value));
const iconIds = new Set(['computer','underweb','torent','ft-studio','ripline','rap-notebook']);
function normalizeIcons(value) {
  return Object.fromEntries(Object.entries(isRecord(value)?value:{}).filter(([id,p])=>iconIds.has(id)&&Number.isFinite(p?.x)&&Number.isFinite(p?.y)).map(([id,p])=>[id,{x:Math.max(0,p.x),y:Math.max(0,p.y)}]));
}
export function setDesktopIconPosition(state,id,position) {
  const normalized=normalizeSnapshot(state), valid=normalizeIcons({[id]:position});
  return {...normalized,desktopIcons:{...normalized.desktopIcons,...valid}};
}
export function resetDesktopIconPositions(state) { return {...normalizeSnapshot(state),desktopIcons:{}}; }
export function layoutDesktopIcons(ids,positions,{width,height}) {
  const columnsHeight=Math.max(1,Math.floor((height-8)/88)),valid=normalizeIcons(positions);
  return Object.fromEntries(ids.map((id,index)=>{
    const p=valid[id]??{x:8+Math.floor(index/columnsHeight)*80,y:8+(index%columnsHeight)*88};
    return [id,{x:Math.max(0,Math.min(p.x,width-80)),y:Math.max(0,Math.min(p.y,height-88))}];
  }));
}

function normalizeProject(value) {
  if(value?.recoveryIssue&&value.recoveryData)return clone(value);
  if(value?.kind==='lyrics'||value?.kind==='beat'){
    const valid=value.kind==='lyrics'?normalizeLyric(value):normalizeBeat(value);
    return valid??{id:typeof value.id==='string'?value.id:'recovered-project',kind:value.kind,name:value.name??'Повреждённый проект',recoveryIssue:'Не удалось прочитать проект. Исходные данные сохранены.',recoveryData:clone(value)};
  }
  return isRecord(value) && typeof value.id === 'string' && value.id.trim() ? clone(value) : null;
}

function normalizeDownload(value) {
  const status = downloadStates.has(value?.status) ? value.status : 'idle';
  const received = Number.isFinite(value?.receivedBytes) ? Math.max(0, value.receivedBytes) : 0;
  if (status === 'installed') return { status, receivedBytes: 0 };
  if (status === 'ready-to-install') return { status, receivedBytes: FT_STUDIO_BYTES };
  if (status === 'downloading') {
    return received >= FT_STUDIO_BYTES
      ? { status: 'ready-to-install', receivedBytes: FT_STUDIO_BYTES }
      : { status, receivedBytes: received };
  }
  return { status: 'idle', receivedBytes: 0 };
}

function normalizeSnapshot(value) {
  const source = isRecord(value) ? value : {};
  const projects = Array.isArray(source.projects) ? source.projects.map(normalizeProject).filter(Boolean) : [];
  const music=normalizeMusic(source.music,projects),writing=normalizeWriting(source.writing,projects),recording=normalizeRecordingState(source.recording,projects);
  // BL-001 archives are inert history, never candidates for automatic job resumption.
  // Keep them even if the player later edits the text or deletes its old project.
  const retiredSourceWork=(Array.isArray(source.retiredSourceWork)?source.retiredSourceWork:[])
    .filter(a=>['music','writing','recording'].includes(a?.domain)&&drumById(a.sourceId)?.retired&&isRecord(a.job)).map(clone);
  for(const [domain,state]of Object.entries({music,writing,recording})){
    const job=state.job,beat=projects.find(p=>p.id===job?.beatId&&p.kind==='beat');
    if(job&&beat?.audioIssue==='retired-source'&&(domain!=='writing'||job.kind==='adapt')){
      retiredSourceWork.push({domain,sourceId:beat.drumId,job:clone(job)});state.job=null;
    }
  }
  // Damaged saves may contain several valid jobs. Recover one owner in stable
  // schema order; completed projects and already credited practice are retained.
  if(music.job){writing.job=null;recording.job=null;}else if(writing.job)recording.job=null;
  const battleSubmissions=normalizeBattleSubmissions(source.battleSubmissions);
  let trackVersions=normalizeTrackVersions(source.trackVersions);
  for(const submission of battleSubmissions){
    if(submission.version!==1||submission.issue||submission.trackVersionId)continue;
    const captured=captureTrackVersion({projects:[submission.track,...(submission.lyrics?[submission.lyrics]:[])],trackVersions},{projectId:submission.projectId,nowMinute:(submission.submittedDay-1)*1440});
    if(captured.ok){trackVersions=captured.state.trackVersions;submission.trackVersionId=captured.versionId;submission.timePrecision='day-only';}
  }
  return withSoftware({
    version: 1,
    noviceSchema: 1,
    ...(typeof source.noviceMigration==='string'?{noviceMigration:source.noviceMigration}:{}),
    power: source.power === 'on' ? 'on' : 'off',
    wallpaper: wallpaperIds.has(source.wallpaper) ? source.wallpaper : 'courtyard',
    desktopIcons: normalizeIcons(source.desktopIcons),
    download: normalizeDownload(source.download),
    projects,
    music,writing,recording,
    ...(retiredSourceWork.length?{retiredSourceWork}:{}),
    creativeWork:normalizeCreativeWork(source.creativeWork,projects),
    community:normalizeCommunity(source.community),
    social:normalizeSocial(source.social),
    battleWindows:normalizeBattleWindows(source.battleWindows),
    socialRuntime:normalizeSocialRuntime(source.socialRuntime),
    communityAudio:normalizeCommunityAudio(source.communityAudio),
    phone:normalizePhone(source.phone),
    battleKnowledge:normalizeBattleKnowledge(source.battleKnowledge),
    judging:normalizeJudging(source.judging),
    judgingSchedule:normalizeJudgingSchedule(source.judgingSchedule),
    resultReactions:normalizeResultReactions(source.resultReactions),
    household:normalizeHousehold(source.household),
    battleApplications:normalizeApplications(source.battleApplications),
    battleSubmissions,trackVersions,npcTracks:normalizeNpcTracks(source.npcTracks),tournaments:normalizeTournaments(source.tournaments),battleHistory:normalizeBattleHistory(source.battleHistory),
    outgoingUpload:normalizeOutgoingUpload(source.outgoingUpload,trackVersions),
    outgoingUploadRecovery:Array.isArray(source.outgoingUploadRecovery)?source.outgoingUploadRecovery.map(clone):[],
    outgoingMessage:normalizeOutgoingMessage(source.outgoingMessage,trackVersions),
    outgoingMessageRecovery:Array.isArray(source.outgoingMessageRecovery)?source.outgoingMessageRecovery.map(clone):[],
    draft: isRecord(source.draft) ? clone(source.draft) : null,
    lastGameMinute: Number.isFinite(source.lastGameMinute) && source.lastGameMinute >= 0 ? source.lastGameMinute : null,
  },normalizeSoftware(source.software,normalizeDownload(source.download)));
}

export function createVirtualPcState(seed) {
  return normalizeSnapshot(seed);
}

export function diskUsage(state) {
  const normalized = normalizeSnapshot(state);
  const accounting=softwareDiskBytes(normalized);
  const downloadMb = accounting.downloaded/1000000;
  const installedMb = accounting.installed/1000000;
  const projectsMb = normalized.projects.length * PROJECT_MB;
  const usedMb = accounting.used/1000000;
  return {
    capacityMb: VIRTUAL_DISK_MB,
    systemMb: SYSTEM_RESERVED_MB,
    usedMb,
    freeMb: accounting.free/1000000,
    downloadMb,
    installedMb,
    projectsMb,
  };
}

export function setPcPower(state, power) {
  const normalized = normalizeSnapshot(state);
  if(power!=='on'&&power!=='off')return normalized;
  return {...normalized,power,lastGameMinute:null};
}

export function setWallpaper(state, wallpaper) {
  const normalized = normalizeSnapshot(state);
  return wallpaperIds.has(wallpaper) ? { ...normalized, wallpaper } : normalized;
}

export function startFtDownload(state) {
  const normalized = normalizeSnapshot(state);
  return openMetadata(normalized).state;
}

export function cancelFtDownload(state) {
  const normalized = normalizeSnapshot(state);
  return normalized.software.transfers.ft?cancelTransfer(normalized,'ft').state:normalized;
}

export function markFtDownloadComplete(state) {
  const normalized = normalizeSnapshot(state);
  if(normalized.download.status!=='downloading')return normalized;
  delete normalized.software.transfers.ft;
  return withSoftware(normalized,{...normalized.software,ft:{...normalized.software.ft,receivedBytes:FT_STUDIO_BYTES}});
}

export function installFtStudio(state) {
  const normalized = normalizeSnapshot(state);
  return advanceInstaller(normalized).state;
}

export function saveStudioProject(state, project) {
  const normalized = normalizeSnapshot(state);
  const savedProject = normalizeProject(project);
  if (!savedProject) return { ok: false, reason: 'invalid-project', state: normalized };
  const index = normalized.projects.findIndex(existing => existing.id === savedProject.id);
  if (index < 0 && diskUsage(normalized).freeMb < PROJECT_MB) {
    return { ok: false, reason: 'insufficient-space', state: normalized };
  }
  const projects = [...normalized.projects];
  if (index < 0) projects.push(savedProject);
  else projects[index] = savedProject;
  return { ok: true, reason: '', state: { ...normalized, projects } };
}

export function saveVirtualPcState(storage, state) {
  try {
    if (!storage) return false;
    const raw=storage.getItem?.(VIRTUAL_PC_STORAGE_KEY);
    let parsed;try{parsed=raw?decodePcSave(raw):null;}catch{/* A fresh game may replace an unreadable save, as before. */}
    if(isRecord(parsed)&&parsed.version===1&&!Object.hasOwn(parsed,'household'))reserveHouseholdBackup(storage,raw);
    if(isRecord(parsed)&&parsed.version===1&&parsed.music?.genres?.version!==1)reserveGenreBackup(storage,raw);
    if(isRecord(parsed)&&parsed.version===1&&parsed.creativeWork?.version!==1)reserveCreativeBackup(storage,raw);
    if(isRecord(parsed)&&parsed.version===1&&!Object.hasOwn(parsed,'battleSubmissions'))reserveSubmissionBackup(storage,raw);
    if(isRecord(parsed)&&parsed.version===1&&parsed.software?.transferVersion!==2)reserveTransferBackup(storage,raw);
    if(isRecord(parsed)&&parsed.version===1&&!Object.hasOwn(parsed,'trackVersions'))reserveTrackVersionBackup(storage,raw);
    if(isRecord(parsed)&&parsed.version===1&&parsed.socialRuntime?.version!==1)reserveSocialBackup(storage,raw);
    if(isRecord(parsed)&&parsed.version===1&&(parsed.social?.schemaVersion??0)<2)reservePersonalBackup(storage,raw);
    if(isRecord(parsed)&&Array.isArray(parsed.battleWindows)&&parsed.battleWindows.some(w=>w?.battleId==='makarevich-1'&&w.judgingPolicyVersion!==2)&&state.battleWindows?.some(w=>w.battleId==='makarevich-1'&&w.judgingPolicyVersion===2)){
      const key=VIRTUAL_PC_STORAGE_KEY+'-before-tournament-v2';if(storage.getItem(key)===null)storage.setItem(key,raw);
    }
    storage.setItem(VIRTUAL_PC_STORAGE_KEY, encodePcSave(normalizeSnapshot(state)));
    return true;
  } catch {
    return false;
  }
}

function reservePersonalBackup(storage,raw){
  const key=VIRTUAL_PC_STORAGE_KEY+'-before-personal-dialogs-v2';
  if(storage.getItem(key)===null)storage.setItem(key,raw);
}
function reserveSocialBackup(storage,raw){
  const key=VIRTUAL_PC_STORAGE_KEY+'-before-social-delivery';
  if(storage.getItem(key)===null)storage.setItem(key,raw);
}
function reserveHouseholdBackup(storage,raw){
  const key=VIRTUAL_PC_STORAGE_KEY+'-before-household';
  if(storage.getItem(key)===null)storage.setItem(key,raw);
}
function reserveTrackVersionBackup(storage,raw){
  const key=VIRTUAL_PC_STORAGE_KEY+'-before-track-versions';
  if(storage.getItem(key)===null)storage.setItem(key,raw);
}
function reserveGenreBackup(storage,raw){
  const key=VIRTUAL_PC_STORAGE_KEY+'-before-genres';
  if(storage.getItem(key)===null)storage.setItem(key,raw);
}
function reserveCreativeBackup(storage,raw){
  const key=VIRTUAL_PC_STORAGE_KEY+'-before-creative-work';
  if(storage.getItem(key)===null)storage.setItem(key,raw);
}
function reserveSubmissionBackup(storage,raw){
  const key=VIRTUAL_PC_STORAGE_KEY+'-before-battle-submissions';
  if(storage.getItem(key)===null)storage.setItem(key,raw);
}
function restoredSnapshot(parsed){
  const restored=createVirtualPcState(parsed);
  if(Object.keys(restored.software.transfers).length)restored.lastGameMinute=null;
  return restored;
}
function reserveTransferBackup(storage,raw){
  const key=VIRTUAL_PC_STORAGE_KEY+'-before-parallel-transfers';
  if(storage.getItem(key)===null)storage.setItem(key,raw);
}

export function loadVirtualPcState(storage) {
  try {
    if (!storage) return { ok: false, state: createVirtualPcState() };
    const raw = storage.getItem(VIRTUAL_PC_STORAGE_KEY);
    if (raw === null) return { ok: true, state: createVirtualPcState() };
    const parsed = decodePcSave(raw);
    if (!isRecord(parsed) || parsed.version !== 1) return { ok: false, state: createVirtualPcState() };
    if(!Object.hasOwn(parsed,'household')){
      try{reserveHouseholdBackup(storage,raw);}catch{return {ok:false,reason:'household-backup-failed',state:restoredSnapshot(parsed)};}
    }
    if(parsed.music?.genres?.version!==1){
      try{reserveGenreBackup(storage,raw);}catch{return {ok:false,reason:'genre-backup-failed',state:restoredSnapshot(parsed)};}
    }
    if(parsed.creativeWork?.version!==1){
      try{reserveCreativeBackup(storage,raw);}catch{return {ok:false,reason:'creative-work-backup-failed',state:restoredSnapshot(parsed)};}
    }
    if(!Object.hasOwn(parsed,'battleSubmissions')){
      try{reserveSubmissionBackup(storage,raw);}catch{return {ok:false,reason:'battle-submissions-backup-failed',state:restoredSnapshot(parsed)};}
    }
    if(parsed.software?.transferVersion!==2){
      try{reserveTransferBackup(storage,raw);}catch{return {ok:false,reason:'parallel-transfers-backup-failed',state:restoredSnapshot(parsed)};}
    }
    if(!Object.hasOwn(parsed,'trackVersions')){
      try{reserveTrackVersionBackup(storage,raw);}
      catch{return {ok:false,reason:'track-versions-backup-failed',state:restoredSnapshot(parsed)};}
    }
    if(parsed.socialRuntime?.version!==1){
      try{reserveSocialBackup(storage,raw);}catch{return {ok:false,reason:'social-delivery-backup-failed',state:restoredSnapshot(parsed)};}
    }
    if((parsed.social?.schemaVersion??0)<2){
      try{reservePersonalBackup(storage,raw);}catch{return {ok:false,reason:'personal-dialogs-backup-failed',state:restoredSnapshot(parsed)};}
    }
    return { ok: true, state: restoredSnapshot(parsed) };
  } catch {
    return { ok: false, state: createVirtualPcState() };
  }
}

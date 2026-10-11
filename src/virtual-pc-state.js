import {normalizeMusic,normalizeBeat} from './beat-production.js?rev=32';
import {normalizeWriting,normalizeLyric} from './lyric-production.js?rev=32';
import {normalizeRecordingState} from './vocal-production.js?rev=32';
import {normalizeCommunity} from './underweb-community.js?rev=28';
import {BATTLE_BRIEFS} from './virtual-pc-catalog.js?rev=28';
import {normalizeHousehold} from './home-food.js?rev=28';
import {normalizeSoftware,withSoftware,softwareDiskBytes,openMetadata,cancelTransfer,advanceInstaller} from './pc-software.js?rev=28';
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
  if(value?.kind==='lyrics')return normalizeLyric(value);
  if(value?.kind==='beat')return normalizeBeat(value);
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
  // Damaged saves may contain several valid jobs. Recover one owner in stable
  // schema order; completed projects and already credited practice are retained.
  if(music.job){writing.job=null;recording.job=null;}else if(writing.job)recording.job=null;
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
    community:normalizeCommunity(source.community),
    household:normalizeHousehold(source.household),
    battleApplications:normalizeApplications(source.battleApplications),
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
  if(normalized.software.task){normalized.software.task.baseMinute=null;normalized.software.task.baseBytes=normalized.software[normalized.software.task.appId].receivedBytes;}
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
  return normalized.software.task?.appId==='ft'?cancelTransfer(normalized).state:normalized;
}

export function markFtDownloadComplete(state) {
  const normalized = normalizeSnapshot(state);
  return normalized.download.status === 'downloading'
    ? withSoftware(normalized,{...normalized.software,ft:{...normalized.software.ft,receivedBytes:FT_STUDIO_BYTES},task:null})
    : normalized;
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
    let parsed;try{parsed=raw?JSON.parse(raw):null;}catch{/* A fresh game may replace an unreadable save, as before. */}
    if(isRecord(parsed)&&parsed.version===1&&!Object.hasOwn(parsed,'household'))reserveHouseholdBackup(storage,raw);
    storage.setItem(VIRTUAL_PC_STORAGE_KEY, JSON.stringify(normalizeSnapshot(state)));
    return true;
  } catch {
    return false;
  }
}

function reserveHouseholdBackup(storage,raw){
  const key=VIRTUAL_PC_STORAGE_KEY+'-before-household';
  if(storage.getItem(key)===null)storage.setItem(key,raw);
}
function restoredSnapshot(parsed){
  const restored=createVirtualPcState(parsed),task=restored.software.task;
  if(task){restored.lastGameMinute=null;task.baseMinute=null;task.baseBytes=restored.software[task.appId].receivedBytes;}
  return restored;
}

export function loadVirtualPcState(storage) {
  try {
    if (!storage) return { ok: false, state: createVirtualPcState() };
    const raw = storage.getItem(VIRTUAL_PC_STORAGE_KEY);
    if (raw === null) return { ok: true, state: createVirtualPcState() };
    const parsed = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== 1) return { ok: false, state: createVirtualPcState() };
    if(!Object.hasOwn(parsed,'household')){
      try{reserveHouseholdBackup(storage,raw);}catch{return {ok:false,reason:'household-backup-failed',state:restoredSnapshot(parsed)};}
    }
    return { ok: true, state: restoredSnapshot(parsed) };
  } catch {
    return { ok: false, state: createVirtualPcState() };
  }
}

export const VIRTUAL_PC_STORAGE_KEY = 'battle-life-virtual-pc-v1';
export const VIRTUAL_DISK_MB = 1500;
export const FT_STUDIO_BYTES = 800000000;
export const FT_STUDIO_MB = FT_STUDIO_BYTES / 1000000;
export const PROJECT_MB = 2;

const wallpaperIds = new Set(['courtyard', 'factory', 'room']);
const downloadStates = new Set(['idle', 'downloading', 'ready-to-install', 'installed']);
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const clone = value => JSON.parse(JSON.stringify(value));
const iconIds = new Set(['computer','documents','underweb','torent','ft-studio']);
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
  return {
    version: 1,
    power: source.power === 'on' ? 'on' : 'off',
    wallpaper: wallpaperIds.has(source.wallpaper) ? source.wallpaper : 'courtyard',
    desktopIcons: normalizeIcons(source.desktopIcons),
    download: normalizeDownload(source.download),
    projects,
    draft: isRecord(source.draft) ? clone(source.draft) : null,
    lastGameMinute: Number.isFinite(source.lastGameMinute) && source.lastGameMinute >= 0 ? source.lastGameMinute : null,
  };
}

export function createVirtualPcState(seed) {
  return normalizeSnapshot(seed);
}

export function diskUsage(state) {
  const normalized = normalizeSnapshot(state);
  const downloadMb = ['downloading', 'ready-to-install'].includes(normalized.download.status)
    ? normalized.download.receivedBytes / 1000000 : 0;
  const installedMb = normalized.download.status === 'installed' ? FT_STUDIO_MB : 0;
  const projectsMb = normalized.projects.length * PROJECT_MB;
  const usedMb = downloadMb + installedMb + projectsMb;
  return {
    capacityMb: VIRTUAL_DISK_MB,
    usedMb,
    freeMb: Math.max(0, VIRTUAL_DISK_MB - usedMb),
    downloadMb,
    installedMb,
    projectsMb,
  };
}

export function setPcPower(state, power) {
  const normalized = normalizeSnapshot(state);
  return power === 'on' || power === 'off' ? { ...normalized, power } : normalized;
}

export function setWallpaper(state, wallpaper) {
  const normalized = normalizeSnapshot(state);
  return wallpaperIds.has(wallpaper) ? { ...normalized, wallpaper } : normalized;
}

export function startFtDownload(state) {
  const normalized = normalizeSnapshot(state);
  if (normalized.power !== 'on' || normalized.download.status !== 'idle' || diskUsage(normalized).freeMb < FT_STUDIO_MB) return normalized;
  return { ...normalized, download: { status: 'downloading', receivedBytes: 0 } };
}

export function cancelFtDownload(state) {
  const normalized = normalizeSnapshot(state);
  return normalized.download.status === 'downloading'
    ? { ...normalized, download: { status: 'idle', receivedBytes: 0 } }
    : normalized;
}

export function markFtDownloadComplete(state) {
  const normalized = normalizeSnapshot(state);
  return normalized.download.status === 'downloading'
    ? { ...normalized, download: { status: 'ready-to-install', receivedBytes: FT_STUDIO_BYTES } }
    : normalized;
}

export function installFtStudio(state) {
  const normalized = normalizeSnapshot(state);
  return normalized.download.status === 'ready-to-install'
    ? { ...normalized, download: { status: 'installed', receivedBytes: 0 } }
    : normalized;
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
    storage.setItem(VIRTUAL_PC_STORAGE_KEY, JSON.stringify(normalizeSnapshot(state)));
    return true;
  } catch {
    return false;
  }
}

export function loadVirtualPcState(storage) {
  try {
    if (!storage) return { ok: false, state: createVirtualPcState() };
    const raw = storage.getItem(VIRTUAL_PC_STORAGE_KEY);
    if (raw === null) return { ok: true, state: createVirtualPcState() };
    const parsed = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== 1) return { ok: false, state: createVirtualPcState() };
    return { ok: true, state: createVirtualPcState(parsed) };
  } catch {
    return { ok: false, state: createVirtualPcState() };
  }
}

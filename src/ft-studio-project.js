import { BATTLE_BRIEFS } from './virtual-pc-catalog.js?rev=59';

export const STUDIO_TRACK_IDS = Object.freeze(['kick', 'snare', 'hat', 'bass']);
export const STUDIO_STEP_COUNT = 16;
export const STUDIO_BAR_COUNT = 8;
export const STUDIO_MIN_BPM = 72;
export const STUDIO_MAX_BPM = 150;

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const knownBattleIds = new Set(BATTLE_BRIEFS.map(brief => brief.id));
const defaultPatterns = Object.freeze({
  kick: [0, 4, 8, 12],
  snare: [4, 12],
  hat: [0, 2, 4, 6, 8, 10, 12, 14],
  bass: [0, 6, 8, 14],
});
const defaultGains = Object.freeze({ kick: .8, snare: .65, hat: .35, bass: .7 });

function stepsFor(id) {
  return Array.from({ length: STUDIO_STEP_COUNT }, (_, index) => defaultPatterns[id].includes(index));
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeName(name) {
  return typeof name === 'string' ? name.trim() : '';
}

function normalizeId(id) {
  return typeof id === 'string' && id.trim() ? id.trim() : null;
}

function normalizeTrack(track, id) {
  if (!isRecord(track) || track.id !== id || !Array.isArray(track.steps) || track.steps.length !== STUDIO_STEP_COUNT || !Array.isArray(track.bars) || track.bars.length !== STUDIO_BAR_COUNT || !Number.isFinite(track.gain)) return null;
  if (!track.steps.every(value => typeof value === 'boolean') || !track.bars.every(value => typeof value === 'boolean')) return null;
  return { id, steps: [...track.steps], bars: [...track.bars], gain: clamp(track.gain, 0, 1) };
}

function projectId(input) {
  const existing = normalizeId(input?.id);
  return existing ?? `studio-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createStudioProject(input = {}) {
  const name = normalizeName(input.name);
  if (!name || name.length > 32) return { ok: false, reason: 'invalid-name', project: null };
  if (!knownBattleIds.has(input.battleId)) return { ok: false, reason: 'invalid-battle', project: null };
  const bpm = Number.isFinite(input.bpm) ? clamp(Math.round(input.bpm), STUDIO_MIN_BPM, STUDIO_MAX_BPM) : 92;
  return {
    ok: true,
    reason: '',
    project: {
      version: 1,
      id: projectId(input),
      name,
      battleId: input.battleId,
      bpm,
      tracks: STUDIO_TRACK_IDS.map(id => ({ id, steps: stepsFor(id), bars: Array(STUDIO_BAR_COUNT).fill(true), gain: defaultGains[id] })),
    },
  };
}

export function normalizeStudioProject(value) {
  if (!isRecord(value) || value.version !== 1) return null;
  const name = normalizeName(value.name);
  const id = normalizeId(value.id);
  if (!id || !name || name.length > 32 || !knownBattleIds.has(value.battleId) || !Number.isFinite(value.bpm)) return null;
  if (!Array.isArray(value.tracks) || value.tracks.length !== STUDIO_TRACK_IDS.length) return null;
  const tracks = STUDIO_TRACK_IDS.map(id => normalizeTrack(value.tracks.find(track => track?.id === id), id));
  if (tracks.some(track => track === null)) return null;
  return { version: 1, id, name, battleId: value.battleId, bpm: clamp(Math.round(value.bpm), STUDIO_MIN_BPM, STUDIO_MAX_BPM), tracks };
}

function updateTrack(project, trackId, change) {
  const normalized = normalizeStudioProject(project);
  if (!normalized || !STUDIO_TRACK_IDS.includes(trackId)) return project;
  return { ...normalized, tracks: normalized.tracks.map(track => track.id === trackId ? change(track) : track) };
}

export function setStudioStep(project, trackId, step, enabled) {
  if (!Number.isInteger(step) || step < 0 || step >= STUDIO_STEP_COUNT || typeof enabled !== 'boolean') return project;
  return updateTrack(project, trackId, track => ({ ...track, steps: track.steps.map((value, index) => index === step ? enabled : value) }));
}

export function setArrangementCell(project, trackId, bar, enabled) {
  if (!Number.isInteger(bar) || bar < 0 || bar >= STUDIO_BAR_COUNT || typeof enabled !== 'boolean') return project;
  return updateTrack(project, trackId, track => ({ ...track, bars: track.bars.map((value, index) => index === bar ? enabled : value) }));
}

export function setTrackGain(project, trackId, gain) {
  if (!Number.isFinite(gain)) return project;
  return updateTrack(project, trackId, track => ({ ...track, gain: clamp(gain, 0, 1) }));
}

export function setBpm(project, bpm) {
  const normalized = normalizeStudioProject(project);
  if (!normalized || !Number.isFinite(bpm)) return project;
  return { ...normalized, bpm: clamp(Math.round(bpm), STUDIO_MIN_BPM, STUDIO_MAX_BPM) };
}

export function projectFingerprint(project) {
  const normalized = normalizeStudioProject(project);
  return normalized ? JSON.stringify(normalized) : '';
}

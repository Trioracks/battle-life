import { advanceCampaign } from './game-state.js';

function trackQuality(campaign, base = 2.4) {
  const skills = campaign.player?.skills;
  if (!skills) return base;
  return base + (skills.writing + skills.flow + skills.musicality + skills.beatmaking + skills.sound) / 500;
}

function update(campaign, action, track) {
  const result = advanceCampaign(campaign, action);
  return { state: { ...result.state, track }, completed: true, message: action.label };
}

const stageOrder = Object.freeze({
  draft: 1,
  'beat-ready': 2,
  recorded: 3,
  mixed: 4,
  mastered: 5,
  submitted: 6,
});

function atLeast(track, stage) {
  return (stageOrder[track?.stage] ?? 0) >= stageOrder[stage];
}

function step(id, label, minutes, state, reason = '') {
  return { id, label, minutes, state, reason };
}

export function getTrackStepStatus(campaign) {
  const registered = campaign.tournament.registered;
  const researched = campaign.tournament.researchHints.length > 0;
  const track = campaign.track;
  const drafted = atLeast(track, 'draft');
  const beatReady = atLeast(track, 'beat-ready');
  const recorded = atLeast(track, 'recorded');
  const mixed = atLeast(track, 'mixed');
  const mastered = atLeast(track, 'mastered');
  const submitted = atLeast(track, 'submitted');
  return [
    step('register', 'Зарегистрироваться', 0, registered ? 'done' : 'ready'),
    step('research', 'Изучить архив', 60, researched ? 'done' : registered ? 'ready' : 'locked', registered ? '' : 'Сначала зарегистрируйся.'),
    step('draft', 'Сделать черновик', 120, drafted ? 'done' : registered ? 'ready' : 'locked', registered ? '' : 'Сначала зарегистрируйся.'),
    step('beat', 'Выбрать бит', 20, beatReady ? 'done' : drafted ? 'ready' : 'locked', drafted ? '' : 'Сначала сделай черновик.'),
    step('record', 'Записать у микрофона', 150, recorded ? 'done' : beatReady ? 'ready' : 'locked', beatReady ? 'Подойди к микрофону в квартире.' : 'Сначала выбери бит.'),
    step('mix', 'Свести трек', 120, mixed ? 'done' : recorded ? 'ready' : 'locked', recorded ? '' : 'Сначала запиши вокал.'),
    step('master', 'Смастерить трек', 120, mastered ? 'done' : mixed ? 'ready' : 'locked', mixed ? '' : 'Сначала сведи трек.'),
    step('submit', 'Сдать трек', 10, submitted ? 'done' : mastered ? 'ready' : 'locked', mastered ? '' : 'Для отправки нужен готовый мастер.'),
  ];
}

export function startDraft(campaign, brief) {
  const quality = trackQuality(campaign) + (brief.useResearch ? .35 : 0) + (brief.focus === 2 ? .2 : 0);
  return update(campaign, { id: 'write-draft', label: 'Пишет черновик', minutes: 120, effects: { energy: -5, leisure: -2 } }, { stage: 'draft', focus: brief.focus, useResearch: Boolean(brief.useResearch), genre: null, take: null, quality, confidence: Math.round((quality + .8) * 10) / 10 });
}

export function polishDraft(campaign) {
  if (campaign.track?.stage !== 'draft') return { state: campaign, completed: false, message: 'Дорабатывать можно только черновик.' };
  const track = { ...campaign.track, quality: Math.round((campaign.track.quality + .35) * 10) / 10, confidence: Math.round((campaign.track.confidence + .2) * 10) / 10 };
  return update(campaign, { id: 'polish-draft', label: 'Дорабатывает черновик', minutes: 60, effects: { energy: -2 } }, track);
}

export function chooseBeat(campaign, genre) {
  if (campaign.track?.stage !== 'draft') return { state: campaign, completed: false, message: 'Сначала нужен черновик текста.' };
  const track = { ...campaign.track, stage: 'beat-ready', genre, quality: Math.round((campaign.track.quality + (genre === 'boom-bap' ? .8 : .4)) * 10) / 10 };
  return update(campaign, { id: 'choose-beat', label: 'Подбирает бит', minutes: 20, effects: { leisure: -.3 } }, track);
}

export function recordTrack(campaign, take) {
  if (campaign.track?.stage !== 'beat-ready') return { state: campaign, completed: false, message: 'Для записи нужен текст и бит.' };
  const bonus = take === 'takes' ? .8 : .25;
  const track = { ...campaign.track, stage: 'recorded', take, quality: Math.round((campaign.track.quality + bonus) * 10) / 10 };
  return update(campaign, { id: 'record-track', label: 'Записывает вокал', minutes: take === 'takes' ? 150 : 120, effects: { energy: -8, leisure: -1 } }, track);
}

export function recordAtMicrophone(campaign, take) {
  const result = recordTrack(campaign, take);
  if (!result.completed) return result;
  return {
    ...result,
    state: { ...result.state, track: { ...result.state.track, recordedAt: 'home-microphone' } },
  };
}

export function mixTrack(campaign) {
  if (campaign.track?.stage !== 'recorded') return { state: campaign, completed: false, message: 'Сначала запиши вокал.' };
  const track = { ...campaign.track, stage: 'mixed', quality: Math.round((campaign.track.quality + .8) * 10) / 10 };
  return update(campaign, { id: 'mix-track', label: 'Сводит трек', minutes: 120, effects: { energy: -4 } }, track);
}

export function masterTrack(campaign) {
  if (campaign.track?.stage !== 'mixed') return { state: campaign, completed: false, message: 'Сначала сведи трек.' };
  const track = { ...campaign.track, stage: 'mastered', quality: Math.round((campaign.track.quality + .65) * 10) / 10 };
  return update(campaign, { id: 'master-track', label: 'Мастерит трек', minutes: 120, effects: { energy: -3 } }, track);
}

export function submitTrack(campaign) {
  if (campaign.track?.stage !== 'mastered') return { state: campaign, completed: false, message: 'Для отправки нужен готовый мастер.' };
  if (!campaign.tournament.registered) return { state: campaign, completed: false, message: 'Сначала зарегистрируйся на баттл.' };
  const track = { ...campaign.track, stage: 'submitted' };
  const result = advanceCampaign(campaign, { id: 'submit-track', label: 'Отправляет заявку', minutes: 10, effects: {} });
  return { state: { ...result.state, track, tournament: { ...result.state.tournament, submitted: true } }, completed: true, message: 'Заявка отправлена.' };
}

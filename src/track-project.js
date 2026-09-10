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

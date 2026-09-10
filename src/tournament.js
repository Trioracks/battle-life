import { advanceCampaign } from './game-state.js';

export const MAKAREWITCH_VI = Object.freeze({
  id: 'makarewitch-vi',
  title: 'MAKAREWITCH VI',
  deadline: { year: 2026, month: 9, day: 20, minutes: 23 * 60 + 59 },
  description: 'Онлайн-отбор локального дивизиона. Судьи любят цельный, атмосферный материал.',
  comments: ['«Когда автор не боится лирики, трек дышит.»', '«Биты тут важны, но пустая техника не проходит.»'],
  hiddenPass: 14,
});

function beforeDeadline(clock) {
  const now = Date.UTC(clock.year, clock.month - 1, clock.day, 0, clock.minutes);
  const deadline = Date.UTC(MAKAREWITCH_VI.deadline.year, MAKAREWITCH_VI.deadline.month - 1, MAKAREWITCH_VI.deadline.day, 0, MAKAREWITCH_VI.deadline.minutes);
  return now <= deadline;
}

export function registerForTournament(campaign, id) {
  if (id !== MAKAREWITCH_VI.id) throw new Error('Этот баттл пока недоступен.');
  if (!beforeDeadline(campaign.clock)) return { state: campaign, message: 'Приём заявок уже закрыт.', completed: false };
  return { state: { ...campaign, tournament: { ...campaign.tournament, registered: true } }, message: 'Заявка на участие принята.', completed: true };
}

export function researchTournament(campaign) {
  if (!campaign.tournament.registered) return { state: campaign, message: 'Сначала зарегистрируйся.', completed: false };
  if (campaign.tournament.researchHints.includes('лиричный фокус')) return { state: campaign, message: 'Главный намёк уже найден.', completed: false };
  const result = advanceCampaign(campaign, { id: 'research-makarewitch', label: 'Изучает архив MAKAREWITCH', minutes: 60, effects: { leisure: -.5 } });
  return { state: { ...result.state, tournament: { ...result.state.tournament, researchHints: [...campaign.tournament.researchHints, 'лиричный фокус'] } }, message: 'Архив намекает: здесь любят лиричный фокус.', completed: true };
}

export function canSubmit(campaign, track) {
  return Boolean(campaign.tournament.registered && beforeDeadline(campaign.clock) && track?.stage === 'mastered');
}

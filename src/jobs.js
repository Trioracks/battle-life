import { advanceCampaign } from './game-state.js';

const jobs = Object.freeze({
  cashier: { id: 'cashier', label: 'Продавец-кассир', district: 'old-center', duration: 480, pay: 1050, minEnergy: 18, effects: { energy: -13, health: -1, leisure: -2 } },
  courier: { id: 'courier', label: 'Пеший курьер', district: 'station-market', duration: 300, pay: 650, minEnergy: 16, effects: { energy: -15, health: -1.5, leisure: -1 } },
  warehouse: { id: 'warehouse', label: 'Ночной склад', district: 'docklands', duration: 720, pay: 1900, minEnergy: 25, effects: { energy: -34, health: -5, leisure: -3 } },
  builder: { id: 'builder', label: 'Чернорабочий на стройке', district: 'east-factory', duration: 480, pay: 1450, minEnergy: 22, effects: { energy: -27, health: -4, leisure: -2 } },
});

export function getJob(id) {
  return jobs[id] ? { ...jobs[id], effects: { ...jobs[id].effects } } : null;
}

export function completeShift(campaign, id) {
  const job = getJob(id);
  if (!job) throw new Error('Такой работы нет.');
  if (campaign.needs.energy < job.minEnergy) return { state: campaign, message: 'Не хватает бодрости для этой смены.', completed: false };
  const result = advanceCampaign(campaign, { id: `shift-${job.id}`, label: job.label, minutes: job.duration, effects: { ...job.effects, cash: job.pay } });
  return { state: result.state, message: `Смена закончилась: +${job.pay} ₽ наличными.`, completed: true };
}

export const jobIds = Object.freeze(Object.keys(jobs));

export const STAT_KEYS = Object.freeze([
  'intelligence', 'writing', 'musicality', 'flow', 'beatmaking', 'sound', 'charisma', 'confidence', 'resilience',
]);

const labels = Object.freeze({
  intelligence: 'Интеллект',
  writing: 'Письмо',
  musicality: 'Музыкальность',
  flow: 'Флоу',
  beatmaking: 'Битмейкинг',
  sound: 'Звук',
  charisma: 'Харизма',
  confidence: 'Уверенность',
  resilience: 'Стойкость',
});

function allocationValue(allocations, key) {
  return Number.isInteger(allocations?.[key]) ? allocations[key] : 0;
}

export function validateAllocations(allocations) {
  for (const key of STAT_KEYS) {
    const value = allocationValue(allocations, key);
    if (value < 0 || value > 4) {
      return { valid: false, total: 0, message: `${labels[key]} нельзя поднять выше 50.` };
    }
  }
  const total = STAT_KEYS.reduce((sum, key) => sum + allocationValue(allocations, key), 0);
  if (total !== 10) return { valid: false, total, message: 'Распредели все 10 очков.' };
  return { valid: true, total, message: 'Готово.' };
}

export function createRapper({ name, nickname, allocations, look }) {
  const validation = validateAllocations(allocations);
  if (!validation.valid) throw new Error(validation.message);
  if (!nickname?.trim()) throw new Error('Нужен никнейм рэпера.');
  if (!name?.trim()) throw new Error('Нужно имя героя.');

  return {
    name: name.trim(),
    nickname: nickname.trim(),
    skills: Object.fromEntries(STAT_KEYS.map((key) => [key, 10 + allocationValue(allocations, key) * 10])),
    look: {
      hair: look?.hair ?? 'bald',
      top: look?.top ?? 'hoodie',
      pants: look?.pants ?? 'cargo',
      cap: look?.cap ?? 'none',
    },
  };
}

export const statLabels = labels;

export const STAT_KEYS = Object.freeze([
  'intelligence', 'writing', 'musicality', 'flow', 'beatmaking', 'sound', 'charisma', 'confidence', 'resilience',
]);

export const LOOK_OPTIONS = Object.freeze({
  hair: Object.freeze(['bald', 'crop', 'mohawk']),
  face: Object.freeze(['clean', 'beard', 'mustache']),
  top: Object.freeze(['tee', 'hoodie', 'jacket']),
  pants: Object.freeze(['cargo', 'jeans', 'shorts']),
});

export const LOOK_PART_LABELS = Object.freeze({
  hair: 'Волосы',
  face: 'Лицо',
  top: 'Верх',
  pants: 'Низ',
});

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

function normalLookPart(part, value) {
  const options = LOOK_OPTIONS[part];
  return options?.includes(value) ? value : options?.[0];
}

export function normalizeLook(look = {}) {
  return Object.fromEntries(Object.keys(LOOK_OPTIONS).map((part) => [part, normalLookPart(part, look[part])]));
}

export function cycleLookPart(look, part, direction) {
  const options = LOOK_OPTIONS[part];
  if (!options) throw new Error('Неизвестная часть внешности.');
  const normalized = normalizeLook(look);
  const current = options.indexOf(normalized[part]);
  const step = Number(direction) < 0 ? -1 : 1;
  return { ...normalized, [part]: options[(current + step + options.length) % options.length] };
}

export function lookPartAtPreviewHeight(relativeY) {
  const y = Math.max(0, Math.min(1, Number(relativeY) || 0));
  if (y < .33) return 'hair';
  if (y < .51) return 'face';
  if (y < .73) return 'top';
  return 'pants';
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
    look: normalizeLook(look),
  };
}

export const statLabels = labels;

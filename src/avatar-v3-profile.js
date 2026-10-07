import { STAT_KEYS, validateAllocations } from './creator.js';

export { STAT_KEYS, statLabels as STAT_LABELS } from './creator.js';

function category(label, options) {
  return Object.freeze({
    label,
    options: Object.freeze(options.map(([id, optionLabel]) => Object.freeze({ id, label: optionLabel }))),
  });
}

export const APPEARANCE_OPTIONS = Object.freeze({
  hair: category('Волосы', [['crop', 'Короткие'], ['parted', 'С пробором'], ['shaggy', 'Растрёпанные']]),
  face: category('Форма лица', [['oval', 'Овальное'], ['square', 'Квадратное'], ['long', 'Вытянутое']]),
  beard: category('Борода', [['none', 'Без бороды'], ['stubble', 'Щетина'], ['full', 'Полная борода']]),
  mustache: category('Усы', [['none', 'Без усов'], ['classic', 'Классические']]),
  top: category('Верх', [['tee', 'Футболка'], ['shirt', 'Рубашка'], ['hoodie', 'Худи'], ['sweater', 'Свитер']]),
  bottom: category('Низ', [['jeans', 'Джинсы'], ['breeches', 'Бриджи'], ['shorts', 'Шорты'], ['sports', 'Спортивные штаны']]),
  footwear: category('Обувь', [['sneakers', 'Кроссовки'], ['boots', 'Ботинки'], ['flipflops', 'Шлёпанцы'], ['sandals', 'Сандалии']]),
});

export const DEFAULT_APPEARANCE = Object.freeze({
  hair: 'crop', face: 'oval', beard: 'none', mustache: 'none',
  top: 'tee', bottom: 'jeans', footwear: 'sneakers',
});

export const SAVE_KEY = 'battle-life-apartment-v3';

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeAppearance(input) {
  const appearance = isRecord(input) ? input : {};
  return Object.fromEntries(Object.entries(APPEARANCE_OPTIONS).map(([key, { options }]) => [
    key,
    options.some(({ id }) => id === appearance[key]) ? appearance[key] : DEFAULT_APPEARANCE[key],
  ]));
}

export function applyAppearance(model, appearance) {
  const normalized = normalizeAppearance(appearance);
  model?.traverse?.((node) => {
    const match = /^look-([^-]+)-([^_-]+)(?:[-_]|$)/.exec(node.name);
    if (match && Object.hasOwn(APPEARANCE_OPTIONS, match[1])) {
      node.visible = normalized[match[1]] === match[2];
    }
  });
  return normalized;
}

export function createProfile(input = {}) {
  const { name, allocations, appearance } = input ?? {};
  if (typeof name !== 'string' || !name.trim()) throw new Error('Нужно имя героя.');
  if (!isRecord(allocations)) throw new Error('Распредели все 10 очков.');
  const points = Object.fromEntries(STAT_KEYS.map((key) => {
    const value = Object.hasOwn(allocations, key) ? allocations[key] : 0;
    if (!Number.isInteger(value)) throw new Error('Очки характеристик должны быть целыми числами.');
    return [key, value];
  }));
  const validation = validateAllocations(points);
  if (!validation.valid) throw new Error(validation.message);
  return {
    version: 3,
    name: name.trim(),
    skills: Object.fromEntries(STAT_KEYS.map((key) => [key, 10 + points[key] * 10])),
    appearance: normalizeAppearance(appearance),
  };
}

function validateProfile(input) {
  if (!isRecord(input) || input.version !== 3 || !isRecord(input.skills)) {
    throw new Error('Сохранение героя имеет неверный формат.');
  }
  const allocations = Object.fromEntries(STAT_KEYS.map((key) => {
    const value = input.skills[key];
    if (!Object.hasOwn(input.skills, key) || !Number.isInteger(value) || value < 10 || value > 50 || value % 10 !== 0) {
      throw new Error('Характеристики сохранённого героя должны быть от 10 до 50 с шагом 10.');
    }
    return [key, (value - 10) / 10];
  }));
  return createProfile({ name: input.name, allocations, appearance: input.appearance });
}

export function saveProfile(storage, profile) {
  try {
    const validated = validateProfile(profile);
    if (typeof storage?.setItem !== 'function') throw new Error('Хранилище сохранений недоступно.');
    storage.setItem(SAVE_KEY, JSON.stringify(validated));
    return { ok: true, profile: validated };
  } catch (error) {
    return { ok: false, error: error?.message || 'Не удалось сохранить героя.' };
  }
}

export function loadProfile(storage) {
  try {
    if (typeof storage?.getItem !== 'function') throw new Error('Хранилище сохранений недоступно.');
    const saved = storage.getItem(SAVE_KEY);
    return { ok: true, profile: saved === null ? null : validateProfile(JSON.parse(saved)) };
  } catch (error) {
    return { ok: false, error: error?.message || 'Не удалось загрузить героя.', profile: null };
  }
}

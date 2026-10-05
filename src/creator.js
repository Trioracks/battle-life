export const STAT_KEYS = Object.freeze([
  'intelligence', 'writing', 'musicality', 'flow', 'beatmaking', 'sound', 'charisma', 'confidence', 'resilience',
]);

export const LOOK_OPTIONS = Object.freeze({
  hair: Object.freeze(['bald', 'crop', 'mohawk']),
  face: Object.freeze(['clean', 'beard', 'mustache']),
  top: Object.freeze(['tee', 'hoodie', 'sweater']),
  pants: Object.freeze(['shorts', 'breeches', 'sports', 'cargo', 'trousers']),
  footwear: Object.freeze(['sandals', 'sneakers', 'canvas', 'shoes', 'boots']),
});

export const LOOK_PART_LABELS = Object.freeze({
  hair: 'Волосы',
  face: 'Лицо',
  top: 'Верх',
  pants: 'Низ',
  footwear: 'Обувь',
});

const lookValueLabels = Object.freeze({
  hair: Object.freeze({ bald: 'Лысый', crop: 'Короткие', mohawk: 'Ирокез' }),
  face: Object.freeze({ clean: 'Без бороды', mustache: 'Усы', beard: 'Борода' }),
  top: Object.freeze({ tee: 'Футболка', hoodie: 'Худи', sweater: 'Свитер' }),
  pants: Object.freeze({ shorts: 'Шорты', breeches: 'Бриджи', sports: 'Спортивные штаны', cargo: 'Карго', trousers: 'Брюки' }),
  footwear: Object.freeze({ sandals: 'Сандалии', sneakers: 'Кроссовки', canvas: 'Кеды', shoes: 'Туфли', boots: 'Сапоги' }),
});

const retiredLookValues = Object.freeze({
  top: Object.freeze({ jacket: 'sweater' }),
  pants: Object.freeze({ jeans: 'trousers' }),
});

const defaultLookValues = Object.freeze({ footwear: 'sneakers' });

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
  const migratedValue = retiredLookValues[part]?.[value] ?? value;
  return options?.includes(migratedValue) ? migratedValue : (defaultLookValues[part] ?? options?.[0]);
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

export function appearanceGeometry(look) {
  const normalized = normalizeLook(look);
  return {
    top: normalized.top,
    legStyle: normalized.pants,
    footwear: normalized.footwear,
    lowerLegsVisible: normalized.pants === 'shorts',
    facialHair: normalized.face,
  };
}

export function selectAppearancePart(currentPart, clickedPart) {
  return Object.hasOwn(LOOK_OPTIONS, clickedPart) ? clickedPart : currentPart;
}

export function lookOptionLabel(part, value) {
  return lookValueLabels[part]?.[value] ?? value;
}

export function profileFaceLayout() {
  return {
    previewYaw: 0,
    rightYaw: Math.PI / 2,
    leftYaw: -Math.PI / 2,
    faceCameraYaw: 0,
    backYaw: Math.PI,
  };
}

export function frontFacingFaceLayout() {
  return {
    earXs: [-.34, .34],
    eyeXs: [-.17, .17],
    faceZ: .27,
  };
}

export function allocationsFromSkills(skills = {}) {
  return Object.fromEntries(STAT_KEYS.map((key) => {
    const visibleValue = Number(skills[key]);
    const allocation = Number.isFinite(visibleValue) ? Math.round((visibleValue - 10) / 10) : 0;
    return [key, Math.max(0, Math.min(4, allocation))];
  }));
}

export function lookPartAtPreviewHeight(relativeY) {
  const y = Math.max(0, Math.min(1, Number(relativeY) || 0));
  if (y < .33) return 'hair';
  if (y < .51) return 'face';
  if (y < .73) return 'top';
  if (y < .92) return 'pants';
  return 'footwear';
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
  if (!name?.trim()) throw new Error('Нужно имя героя.');

  return {
    name: name.trim(),
    nickname: nickname?.trim() || name.trim(),
    skills: Object.fromEntries(STAT_KEYS.map((key) => [key, 10 + allocationValue(allocations, key) * 10])),
    look: normalizeLook(look),
  };
}

export const statLabels = labels;

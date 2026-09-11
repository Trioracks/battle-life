const actions = Object.freeze({
  computer: { id: 'computer', label: 'Сесть за компьютер', tooltip: 'Сесть за компьютер', targetX: 4.93, minutes: 0, animation: 'computer', cue: 'computer', requiresEnergy: 0 },
  bed: { id: 'bed', label: 'Лечь спать', tooltip: 'Лечь спать · 1–12 ч', targetX: 1.25, minutes: 60, animation: 'sleep', cue: 'sleep', requiresEnergy: 0 },
  fridge: { id: 'fridge', label: 'Открыть холодильник', tooltip: 'Открыть холодильник · 5 мин', targetX: -5.72, minutes: 5, animation: 'fridge', cue: 'fridge', requiresEnergy: 0 },
  stove: { id: 'stove', label: 'Приготовить 2 порции', tooltip: 'Приготовить 2 порции · 35 мин', targetX: -4.66, minutes: 35, animation: 'cook', cue: 'cook', requiresEnergy: 8 },
  sink: { id: 'sink', label: 'Помыть посуду', tooltip: 'Помыть посуду · 15 мин', targetX: -3.49, minutes: 15, animation: 'wash', cue: 'dishes', requiresEnergy: 0 },
  microphone: { id: 'microphone', label: 'Записать вокал', tooltip: 'Записать вокал · 2 ч', targetX: 4.43, minutes: 120, animation: 'record', cue: 'mic', requiresEnergy: 20 },
  door: { id: 'door', label: 'Выйти на карту', tooltip: 'Выйти на карту · 5 мин', targetX: 7.64, minutes: 5, animation: 'door', cue: 'door', requiresEnergy: 0 },
});

export function getApartmentAction(id) {
  return actions[id] ? { ...actions[id] } : null;
}

export function canStartApartmentAction(id, needs) {
  const action = actions[id];
  if (!action) return { allowed: false, reason: 'Это не действие квартиры.' };
  if (needs.energy < action.requiresEnergy) {
    return { allowed: false, reason: action.id === 'microphone' ? 'Слишком мало бодрости для записи.' : 'Слишком мало бодрости для этого действия.' };
  }
  return { allowed: true, reason: '' };
}

export function describeApartmentAction(action, needs) {
  if (!action) return { title: '', detail: '', allowed: false, reason: 'Это не действие квартиры.' };
  const availability = canStartApartmentAction(action.id, needs);
  return {
    title: action.label,
    detail: action.tooltip,
    allowed: availability.allowed,
    reason: availability.reason,
  };
}

export const apartmentActionIds = Object.freeze(Object.keys(actions));

const actions = Object.freeze({
  computer: { id: 'computer', label: 'Сесть за компьютер', targetX: 1.8, minutes: 0, animation: 'computer', cue: 'computer', requiresEnergy: 0 },
  bed: { id: 'bed', label: 'Лечь спать', targetX: -3.7, minutes: 60, animation: 'sleep', cue: 'sleep', requiresEnergy: 0 },
  fridge: { id: 'fridge', label: 'Открыть холодильник', targetX: -1.35, minutes: 5, animation: 'fridge', cue: 'fridge', requiresEnergy: 0 },
  stove: { id: 'stove', label: 'Приготовить еду', targetX: -.7, minutes: 35, animation: 'cook', cue: 'cook', requiresEnergy: 8 },
  sink: { id: 'sink', label: 'Помыть посуду', targetX: .15, minutes: 15, animation: 'wash', cue: 'dishes', requiresEnergy: 0 },
  microphone: { id: 'microphone', label: 'Записать вокал', targetX: 1.1, minutes: 120, animation: 'record', cue: 'mic', requiresEnergy: 20 },
  door: { id: 'door', label: 'Выйти на карту', targetX: 4.8, minutes: 0, animation: 'door', cue: 'door', requiresEnergy: 0 },
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

export const apartmentActionIds = Object.freeze(Object.keys(actions));

import { advanceCampaign } from './game-state.js';

export const districts = Object.freeze([
  { id: 'north-sloboda', name: 'Северная Слобода', minutes: 0, role: 'дом и супермаркет' },
  { id: 'old-center', name: 'Старый центр', minutes: 25, role: 'кафе, магазин, баттл-бар' },
  { id: 'rampart-quarter', name: 'Вальный квартал', minutes: 35, role: 'репточка и бар' },
  { id: 'station-market', name: 'Вокзальный рынок', minutes: 30, role: 'рынок и курьеры' },
  { id: 'docklands', name: 'Доковая', minutes: 45, role: 'ночной склад' },
  { id: 'east-factory', name: 'Восточный заводской', minutes: 40, role: 'стройка' },
  { id: 'garden-belt', name: 'Садовый пояс', minutes: 55, role: 'сельпо и окраина' },
]);

export function travelTo(campaign, districtId) {
  const district = districts.find((item) => item.id === districtId);
  if (!district) throw new Error('Такого района нет на карте.');
  const result = advanceCampaign(campaign, { id: `travel-${districtId}`, label: `Едет: ${district.name}`, minutes: district.minutes || 1, effects: { leisure: -.2 } });
  return { state: { ...result.state, location: districtId }, message: `Доехал: ${district.name}.` };
}

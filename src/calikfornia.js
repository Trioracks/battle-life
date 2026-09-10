import { advanceCampaign } from './game-state.js';
import { buyFood } from './household.js';
import { completeShift } from './jobs.js';

export const districts = Object.freeze([
  { id: 'north-sloboda', name: 'Северная Слобода', minutes: 0, role: 'дом и супермаркет' },
  { id: 'old-center', name: 'Старый центр', minutes: 25, role: 'кафе, магазин, баттл-бар' },
  { id: 'rampart-quarter', name: 'Вальный квартал', minutes: 35, role: 'репточка и бар' },
  { id: 'station-market', name: 'Вокзальный рынок', minutes: 30, role: 'рынок и курьеры' },
  { id: 'docklands', name: 'Доковая', minutes: 45, role: 'ночной склад' },
  { id: 'east-factory', name: 'Восточный заводской', minutes: 40, role: 'стройка' },
  { id: 'garden-belt', name: 'Садовый пояс', minutes: 55, role: 'сельпо и окраина' },
]);

const locationsByDistrict = Object.freeze({
  'north-sloboda': Object.freeze([{ id: 'north-supermarket', districtId: 'north-sloboda', label: 'Супермаркет «Радуга»', kind: 'market', description: 'Продукты и доставка домой' }]),
  'old-center': Object.freeze([{ id: 'center-cashier', districtId: 'old-center', label: 'Магазин у площади', kind: 'job', jobId: 'cashier', description: 'Смена продавца-кассира' }]),
  'station-market': Object.freeze([{ id: 'market-courier', districtId: 'station-market', label: 'Курьерская стойка', kind: 'job', jobId: 'courier', description: 'Пешая курьерская смена' }]),
  docklands: Object.freeze([{ id: 'dock-warehouse', districtId: 'docklands', label: 'Ночной склад', kind: 'job', jobId: 'warehouse', description: 'Смена 20:00–08:00' }]),
  'east-factory': Object.freeze([{ id: 'east-construction', districtId: 'east-factory', label: 'Стройка у завода', kind: 'job', jobId: 'builder', description: 'Дневная смена на стройке' }]),
  'rampart-quarter': Object.freeze([{ id: 'rampart-rehearsal', districtId: 'rampart-quarter', label: 'Подвальная репточка', kind: 'soon', description: 'Скоро: репетиции и знакомые' }]),
  'garden-belt': Object.freeze([{ id: 'garden-selpo', districtId: 'garden-belt', label: 'Сельпо «Маяк»', kind: 'soon', description: 'Скоро: продукты окраины' }]),
});

export function getDistrictLocations(districtId) {
  return (locationsByDistrict[districtId] ?? []).map((location) => ({ ...location }));
}

export function startLocationAction(campaign, locationId) {
  const location = Object.values(locationsByDistrict).flat().find((item) => item.id === locationId);
  if (!location) throw new Error('Такой точки на карте нет.');
  if (location.kind === 'market') return buyFood(campaign, 'groceries');
  if (location.kind === 'job') return completeShift(campaign, location.jobId);
  return { state: campaign, completed: false, message: 'Эта точка появится в следующем обновлении.' };
}

export function travelTo(campaign, districtId) {
  const district = districts.find((item) => item.id === districtId);
  if (!district) throw new Error('Такого района нет на карте.');
  const result = advanceCampaign(campaign, { id: `travel-${districtId}`, label: `Едет: ${district.name}`, minutes: district.minutes || 1, effects: { leisure: -.2 } });
  return { state: { ...result.state, location: districtId }, message: `Доехал: ${district.name}.` };
}

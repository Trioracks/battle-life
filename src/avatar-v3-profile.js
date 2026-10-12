import { STAT_KEYS, validateAllocations } from './creator.js?rev=38';
import {createWardrobe,validWardrobe,canWear} from './home-wardrobe.js?rev=38';
import {closedFootwearId,migrateClosedFootwear,reserveFootwearBackup} from './avatar-footwear-migration.js?rev=38';

export { STAT_KEYS, statLabels as STAT_LABELS } from './creator.js?rev=38';

function category(label, options) {
  return Object.freeze({
    label,
    options: Object.freeze(options.map(([id, optionLabel]) => Object.freeze({ id, label: optionLabel }))),
  });
}

export const CLOTHING_COLORS = Object.freeze({white:0xe6e1d7,grey:0x858589,black:0x24252a,red:0xb73535,yellow:0xe0b638,green:0x398353,blue:0x3159a6,lightblue:0x86b8d1,olive:0x697248,beige:0xc3ac86,brown:0x79513a});
const colorOptions=[['white','Белый'],['grey','Серый'],['black','Чёрный'],['red','Красный'],['yellow','Жёлтый'],['green','Зелёный'],['blue','Синий'],['lightblue','Голубой'],['olive','Оливковый'],['beige','Бежевый'],['brown','Коричневый']];
export const APPEARANCE_OPTIONS = Object.freeze({
  hair: category('Волосы', [['bald','Лысый'],['lake','Озеро в лесу'],['buzz','Под машинку — 3 мм'],['crop', 'Короткие'], ['parted', 'С пробором'], ['bowl','Под горшок'],['messy','Растрёпанные'],['longshag','Длинный шегги']]),
  face: category('Форма лица', [['oval', 'Овальное'], ['square', 'Квадратное'], ['long', 'Вытянутое']]),
  beard: category('Борода', [['none', 'Без бороды'], ['stubble', 'Щетина'],['short','Короткая полная'], ['full', 'Широкая полная'],['goatee','Эспаньолка'],['chinstrap','По линии челюсти']]),
  mustache: category('Усы', [['none', 'Без усов'],['pencil','Карандаш'], ['classic', 'Шеврон'],['walrus','Морж'],['handlebar','Закрученные'],['horseshoe','Подкова']]),
  top: category('Верх', [['tee', 'Футболка'], ['shirt', 'Рубашка'], ['hoodie', 'Худи'], ['sweater', 'Свитер'],['tank','Майка'],['turtleneck','Водолазка']]),
  bottom: category('Низ', [['jeans', 'Широкие джинсы'],['skinny','Узкие джинсы'], ['breeches', 'Бриджи'], ['shorts', 'Шорты'], ['sports', 'Спортивные штаны']]),
  footwear: category('Обувь', [['sneakers', 'Кроссовки'],['canvas','Кеды'], ['boots', 'Сапоги'], ['ankleboots', 'Ботинки'], ['highcanvas', 'Высокие кеды']]),
  topColor:category('Цвет верха',colorOptions),bottomColor:category('Цвет низа',colorOptions),footwearColor:category('Цвет обуви',colorOptions),
});

export const DEFAULT_APPEARANCE = Object.freeze({
  hair: 'crop', face: 'oval', beard: 'none', mustache: 'none',
  top: 'tee', bottom: 'jeans', footwear: 'sneakers',
  topColor:'blue',bottomColor:'blue',footwearColor:'grey',
});

export const SAVE_KEY = 'battle-life-apartment-v3';

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeAppearance(input) {
  const appearance = isRecord(input) ? {...input} : {};
  appearance.footwear=closedFootwearId(appearance.footwear);
  if(appearance.hair==='shaggy')appearance.hair='bowl';
  if(appearance.mustache==='chevron')appearance.mustache='classic';
  if(appearance.beard==='broad')appearance.beard='full';
  return Object.fromEntries(Object.entries(APPEARANCE_OPTIONS).map(([key, { options }]) => [
    key,
    options.some(({ id }) => id === appearance[key]) ? appearance[key] : DEFAULT_APPEARANCE[key],
  ]));
}

export function applyAppearance(model, appearance) {
  const normalized = normalizeAppearance(appearance);
  const lookOwners = new WeakMap();
  model?.traverse?.((node) => {
    const owner = lookOwners.get(node.parent);
    if (owner) {
      // GLTFLoader gives material primitives independent Blender mesh names
      // (e.g. full001). Only their containing look owns selection and face fit.
      node.visible = owner.visible;
      lookOwners.set(node, owner);
    } else {
      const match = /^look-([^-]+)-([^_-]+)(?:[-_]|$)/.exec(node.name);
      if (match && Object.hasOwn(APPEARANCE_OPTIONS, match[1])) {
        node.visible = normalized[match[1]] === (match[2]==='shaggy'?'bowl':match[2]);
        if(node.userData?.faceVariant)node.visible&&=node.userData.faceVariant===normalized.face;
        lookOwners.set(node, node);
      }
    }
    for(const material of (Array.isArray(node.material)?node.material:[node.material])){
      const channel=material?.userData?.tintChannel;
      if(channel&&CLOTHING_COLORS[normalized[channel+'Color']]!==undefined)material.color.setHex(CLOTHING_COLORS[normalized[channel+'Color']]);
    }
  });
  return normalized;
}

export function createProfile(input = {}) {
  const { name, appearance } = input ?? {};
  if (typeof name !== 'string' || !name.trim()) throw new Error('Нужно имя героя.');
  const look=normalizeAppearance(appearance);
  return {
    version: 4,
    noviceSchema: 1,
    name: name.trim(),
    skills: Object.fromEntries(STAT_KEYS.map((key) => [key, 10])),
    appearance: look,
    wardrobe: createWardrobe(look),
  };
}

function validateProfile(input) {
  if (!isRecord(input) || ![3,4].includes(input.version) || !isRecord(input.skills) || typeof input.name!=='string' || !input.name.trim()) {
    throw new Error('Сохранение героя имеет неверный формат.');
  }
  const allocations = Object.fromEntries(STAT_KEYS.map((key) => {
    const value = input.skills[key];
    if (!Object.hasOwn(input.skills, key) || !Number.isFinite(value) || value < 10 || value > (input.version===3?50:100) || (input.version===3&&(!Number.isInteger(value)||value%10!==0))) {
      throw new Error('Характеристики сохранённого героя должны быть от 10 до 50 с шагом 10.');
    }
    return [key, (value - 10) / 10];
  }));
  if(input.version===3){const validation=validateAllocations(allocations);if(!validation.valid)throw Error(validation.message);}
  else if(input.noviceSchema!==1||!validWardrobe(input.wardrobe)||!canWear(input,input.appearance))throw Error('Гардероб сохранённого героя имеет неверный формат.');
  return {...input,name:input.name.trim(),skills:{...input.skills},appearance:normalizeAppearance(input.appearance),...(input.version===4?{wardrobe:JSON.parse(JSON.stringify(input.wardrobe))}:{})};
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
    if(saved===null)return {ok:true,profile:null};
    const migration=migrateClosedFootwear(JSON.parse(saved));
    const profile=validateProfile(migration.profile);
    if(migration.changed){reserveFootwearBackup(storage,saved);storage.setItem(SAVE_KEY,JSON.stringify(profile));}
    return {ok:true,profile};
  } catch (error) {
    return { ok: false, error: error?.message || 'Не удалось загрузить героя.', profile: null };
  }
}

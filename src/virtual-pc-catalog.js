const apps = Object.freeze([
  { id: 'computer', label: 'Мой компьютер', iconId: 'computer', description: 'Диск C: и Мои проекты' },
  { id: 'documents', label: 'Мои документы', iconId: 'documents', description: 'Документы и музыкальные проекты' },
  { id: 'underweb', label: 'Underweb', iconId: 'underweb', description: 'Локальная сеть баттлов' },
  { id: 'torent', label: 'torent', iconId: 'torent', description: 'Каталог игровых загрузок' },
  { id: 'ft-studio', label: 'FT Studio', iconId: 'studio', description: 'Музыкальная станция' },
]);

export const WALLPAPERS = Object.freeze([
  { id: 'courtyard', label: 'Ночной двор', path: './assets/ui/virtual-pc/wallpaper-courtyard.png' },
  { id: 'factory', label: 'Заводской рассвет', path: './assets/ui/virtual-pc/wallpaper-factory.png' },
  { id: 'room', label: 'Лампа у стены', path: './assets/ui/virtual-pc/wallpaper-room.png' },
]);

export const BATTLE_BRIEFS = Object.freeze([
  { id: 'concrete-echo', title: 'Бетонное эхо', condition: '90–104 BPM · жёсткий куплет · ночь района' },
  { id: 'open-mic-17', title: 'Открытый микрофон 17', condition: '72–92 BPM · история без припева' },
  { id: 'yard-cipher', title: 'Шифр двора', condition: '96–120 BPM · ответ сопернику · 8 строк' },
]);

export function desktopApps(state) {
  const installed = state?.download?.status === 'installed';
  return apps.filter(app => app.id !== 'ft-studio' || installed).map(app => ({ ...app }));
}

export function resolveUnderweb(address) {
  const normalized = typeof address === 'string' ? address.trim().toLowerCase() : '';
  if (normalized === 'underweb://battles' || normalized === 'баттлы' || normalized === 'battle') {
    return { type: 'battles', briefs: BATTLE_BRIEFS.map(brief => ({ ...brief })) };
  }
  const id = normalized.startsWith('underweb://battles/') ? normalized.slice('underweb://battles/'.length) : '';
  const brief = BATTLE_BRIEFS.find(item => item.id === id);
  if (brief) return { type: 'battle', brief: { ...brief } };
  return { type: 'error', message: 'Такой адрес в Underweb не найден.' };
}

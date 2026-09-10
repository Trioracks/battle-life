const apps = Object.freeze({
  battles: { id: 'battles', label: 'BattleNet', icon: '◈', view: 'battles', description: 'Баттлы и архив' },
  jobs: { id: 'jobs', label: 'Вакансии', icon: '▦', view: 'jobs', description: 'Работа и смены' },
  market: { id: 'market', label: 'Маркет', icon: '▣', view: 'market', description: 'Продукты и техника' },
  bills: { id: 'bills', label: 'Счета', icon: '₽', view: 'bills', description: 'Аренда и платежи' },
});

export function getDesktopApp(id) {
  return apps[id] ? { ...apps[id] } : null;
}

export function openDesktopApp(id) {
  const app = getDesktopApp(id);
  return app ? { view: app.view, app } : null;
}

export const desktopApps = Object.freeze(Object.values(apps));

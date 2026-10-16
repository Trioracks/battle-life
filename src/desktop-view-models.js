import { getInventorySummary } from './game-state.js';
import { getJob } from './jobs.js';
import { MAKAREWITCH_VI } from './tournament.js';

const participantNames = Object.freeze(['МЦ Киряешкин', 'Сердечный Приступ', 'Плата Гоблина', 'Ромка B9', 'Вагин Капиталист Калагерова']);

const employers = Object.freeze({
  cashier: { avatar: 'КБ', name: 'Ирина, старший кассир', review: '«Если не теряться в очереди, деньги выдают без задержек.»' },
  courier: { avatar: 'СМ', name: 'Макс, координатор курьеров', review: '«Заказов много, зато сам выбираешь темп между адресами.»' },
  warehouse: { avatar: 'ДС', name: 'Денис, сменный мастер', review: '«Тяжело, но ночная смена платит честнее остальных.»' },
  builder: { avatar: 'СБ', name: 'Серёга, бригадир', review: '«На стройке не геройствуй — силы нужны и после смены.»' },
});

function deadlineText(deadline) {
  return `${deadline.day} сентября · 23:59`;
}

export function getBattleDetail(campaign, id) {
  if (id !== MAKAREWITCH_VI.id) return null;
  const registered = Boolean(campaign.tournament?.registered);
  return {
    id: MAKAREWITCH_VI.id,
    title: MAKAREWITCH_VI.title,
    description: MAKAREWITCH_VI.description,
    theme: 'Первый круг: «Последний разговор»',
    deadline: deadlineText(MAKAREWITCH_VI.deadline),
    participants: participantNames,
    visibleHints: [...(campaign.tournament?.researchHints ?? [])],
    archiveComments: [...MAKAREWITCH_VI.comments],
    canApply: !registered,
    applyLabel: registered ? 'Заявка принята' : 'Подать заявку',
  };
}

export function getBattleList(campaign) {
  const detail = getBattleDetail(campaign, MAKAREWITCH_VI.id);
  return [{
    id: detail.id,
    title: detail.title,
    deadline: detail.deadline,
    description: detail.description,
    registered: !detail.canApply,
  }];
}

export function getJobListing(id) {
  const job = getJob(id);
  if (!job) return null;
  return { ...job, employer: employers[id], schedule: `${job.duration / 60} ч`, payLabel: `${job.pay.toLocaleString('ru-RU')} ₽ за смену` };
}

export function getMarketCatalog(campaign) {
  const product = Object.freeze({ id: 'groceries', label: 'Набор продуктов', price: 380, ingredients: 3, deliveryMinutes: 40 });
  return {
    cash: campaign.cash,
    inventory: getInventorySummary(campaign),
    stores: [
      { id: 'shesterochka', name: 'Шестёрочка', products: [product] },
      { id: 'povorot', name: 'Поворот', products: [product] },
    ],
    balanceAfter(productId) {
      return productId === product.id ? campaign.cash - product.price : campaign.cash;
    },
  };
}

export function getBankOverview(campaign) {
  return {
    balance: campaign.cash,
    operations: [{ id: 'starting-cash', label: 'Остаток наличных', amount: campaign.cash }],
    bills: [{ id: 'rent', label: 'Аренда жилья', amount: campaign.rent.amount, status: campaign.rent.status, debt: campaign.rent.debt }],
  };
}

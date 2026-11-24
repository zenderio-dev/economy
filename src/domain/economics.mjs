import { isEligible } from './selection.mjs';
import { activities, budgetActivities, financeProfiles, farmingActivities, fundingSources, scales, specialBudgets } from './financeProfiles.mjs';

export function calculate(plan, profile) {
  const fixedCosts = plan.fixed + profile.admin + profile.contributions;
  const startup = plan.initial + profile.setup + plan.working;
  const taxRate = profile.rate / 100;
  const taxesRevenue = profile.base === 'revenue';
  const netContribution = plan.price - plan.variable - (taxesRevenue ? plan.price * taxRate : 0);
  const breakEven = netContribution > 0 ? Math.ceil(fixedCosts / netContribution - 1e-9) : null;

  function at(volume) {
    const revenue = plan.price * volume;
    const operatingCost = plan.variable * volume + fixedCosts;
    const beforeTax = revenue - operatingCost;
    const tax = taxRate * (taxesRevenue ? revenue : Math.max(0, beforeTax));
    return { volume, revenue, operatingCost, beforeTax, tax, net: beforeTax - tax };
  }

  const base = at(plan.units);
  return {
    ...base,
    startup,
    breakEven,
    netContribution,
    margin: base.revenue ? base.net / base.revenue * 100 : null,
    utilization: plan.capacity ? plan.units / plan.capacity * 100 : null,
    payback: base.net > 0 && startup > 0 ? startup / base.net : null,
    firstYear: base.net * 12 - startup,
    scenarios: [at(Math.floor(plan.units * .8)), base, at(Math.ceil(plan.units * 1.2))],
  };
}

const sum = items => items.reduce((total, item) => total + item.amount, 0);
const money = value => Math.round((value + Number.EPSILON) * 100) / 100;
const entries = pairs => pairs.map(([label, amount]) => ({ label, amount: money(amount) }));

function managementCost(key, control) {
  if (control === '1') return key === 'jsc' || key === 'pao' ? 35000 : 25000;
  if (control === '2') return key === 'jsc' || key === 'pao' ? 60000 : 40000;
  return 0;
}

function commercialExample(answers, keys) {
  const scale = scales[answers.scale] ?? scales.small;
  const farming = answers.purpose === 'agriculture' && answers.farmingActivity === 'yes';
  const source = farming ? farmingActivities : activities;
  const key = answers.activity ?? (answers.specialType === 'unitary' ? 'production' : 'service');
  const base = source[key] ?? source.special;
  const activity = answers.purpose === 'team' ? `совместный труд: ${base.name}` : base.name;
  const { name, ...numbers } = base;
  const plan = { ...numbers, units: base.units * scale.volume, fixed: base.fixed * scale.expenses, initial: 0, working: 0, capacity: 0 };
  const profiles = keys.map(key => ({
    ...financeProfiles[key], key,
    admin: financeProfiles[key].admin * scale.expenses + managementCost(key, answers.control),
    contributions: financeProfiles[key].contributions ?? 0,
    setup: 0, rate: 6, base: 'revenue',
  }));
  return {
    kind: 'commercial', activity, scale, plan, profiles,
    explanation: 'Одинаковые продукт, цена и продажи для всех показанных форм. Различаются только условные организационные расходы.',
    caveats: [
      'Все суммы заданы для обучения, а не взяты из рыночной статистики. 6% от выручки — одинаковая условная нагрузка, а не выбранный налоговый режим.',
      'Оплата труда владельца и лично работающих членов, начисления на зарплаты, НДС, амортизация, кредиты и стартовые вложения отдельно не рассчитаны. Остаток не равен полной экономической прибыли или личному доходу.',
      ...(farming ? ['Это условный месяц сельхоздеятельности. Сезонность, урожайность и допустимость ЕСХН проверяются отдельно; КФХ не получает налоговый режим автоматически.'] : []),
      ...(answers.activity === 'special' ? ['Деятельность пока не определена: исходные числа особенно условны. Уточните продукт и разрешительные условия.'] : []),
    ],
  };
}

function budgetExample(answers, keys) {
  const mainKey = keys[0];
  const participants = Math.max(1, Number(answers.special_count ?? answers.owners) || 5);
  let activity, receipts, spending;
  const caveats = [
    'Это пример сметы (плана поступлений и расходов), а не прогноз финансирования. Налоги не рассчитаны: показан остаток до возможных налогов, а не освобождение от них.',
    'Для целевых поступлений отдельно проверяются назначение, условия предоставления, расходования и раздельный учёт. Платные услуги не приравниваются к пожертвованиям.',
  ];
  if (answers.purpose === 'social') {
    const base = budgetActivities[answers.socialGoal] ?? budgetActivities.services;
    activity = base.name;
    receipts = [[fundingSources[answers.fundingSource] ?? 'Плановые поступления', base.price * base.units]];
    spending = [['Расходы на программу / услуги', base.variable * base.units], ['Содержание организации', base.fixed]];
    caveats.push('Число учредителей не приравнивается к числу клиентов, благополучателей или доноров. Объём программы здесь задан отдельно в примере.');
  } else if (answers.purpose === 'propertyGoal') {
    const property = answers.sharedGoal === 'property';
    activity = property ? 'совместное содержание недвижимости' : 'совместная закупка для участников';
    receipts = [[property ? `Платежи ${participants} участников × 6000 ₽` : `Целевой сбор ${participants} участников × 2500 ₽`, participants * (property ? 6000 : 2500)]];
    spending = property
      ? [['Содержание и обслуживание имущества', participants * 3500], ['Резерв на ремонт', participants * 500]]
      : [['Закупка для участников', participants * 1600], ['Организация и доставка', 1000]];
    caveats.push('Для простоты число плательщиков здесь равно указанному числу участников. Реальные собственники, площадь, тарифы и состав членов определяются отдельно.');
  } else if (mainKey === 'laworg') {
    activity = 'содержание коллегии адвокатов';
    receipts = [[`Взносы ${participants} адвокатов на общие расходы × 15000 ₽`, participants * 15000]];
    spending = [['Рабочие места и совместные расходы', participants * 8000], ['Содержание', 5000]];
  } else {
    const template = specialBudgets[mainKey];
    if (!template) throw new Error(`Missing budget scenario: ${mainKey}`);
    activity = template.name;
    receipts = template.receipts;
    spending = template.spending;
    if (template.note) caveats.push(template.note);
  }
  return {
    kind: 'budget', activity, receipts: entries(receipts), spending: entries(spending),
    scale: { name: 'объём учебной сметы' },
    profiles: keys.map(key => ({ ...financeProfiles[key], key, contributions: 0 })),
    explanation: mainKey === 'personal'
      ? 'Поступления от имущества сопоставляются с расходами и выплатами выгодоприобретателям. Переданное имущество не включается в месячные поступления.'
      : 'Проверяется, хватит ли запланированных поступлений на задачи организации и содержание. Остаток не обозначается прибылью владельцев.',
    caveats,
  };
}

export function buildExample(answers, keys = ['ip', 'llc', 'jsc']) {
  for (const key of keys) if (!financeProfiles[key]) throw new Error(`Missing financial profile: ${key}`);
  return keys.every(key => financeProfiles[key].kind === 'commercial')
    ? commercialExample(answers, keys) : budgetExample(answers, keys);
}

function calculateBudget(example, profile) {
  const revenue = money(sum(example.receipts));
  const programCost = money(sum(example.spending));
  const operatingCost = money(programCost + profile.admin);
  const net = money(revenue - operatingCost);
  return {
    key: profile.key, name: profile.name, profile, revenue, programCost, operatingCost,
    tax: null, net, fundingGap: money(Math.max(0, -net)),
    coverage: operatingCost > 0 ? revenue / operatingCost * 100 : null,
    scenarios: [.8, 1, 1.2].map(factor => {
      const receipts = money(revenue * factor);
      return { revenue: receipts, net: money(receipts - operatingCost) };
    }),
  };
}

export function compareFinances(answers, ranking) {
  const eligible = ranking.filter(isEligible);
  if (!eligible.length) return {
    kind: 'unavailable', rows: [],
    explanation: ranking.some(row => !row.excluded.length && row.pending.length)
      ? 'Сначала подтвердите обязательные условия. Финансовый пример появится для подходящей формы.'
      : 'Сначала устраните противоречия в ответах. Расчёт для исключённых форм не показывается.',
  };
  const keys = eligible.map(row => row.key);
  const example = buildExample(answers, keys);
  const rows = example.profiles.map(profile => example.kind === 'commercial'
    ? { ...calculate(example.plan, profile), key: profile.key, name: profile.name, profile }
    : calculateBudget(example, profile));
  return { ...example, rows, recommendedKey: keys[0] };
}

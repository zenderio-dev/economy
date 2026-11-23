import { isEligible } from './selection.mjs';

// All values are illustrative assumptions for a monthly sales plan.
const activities = {
  service: { name: 'студия услуг', price: 2500, units: 45, variable: 450, fixed: 42000 },
  trade: { name: 'магазин товаров', price: 1800, units: 120, variable: 1050, fixed: 54000 },
  production: { name: 'мастерская', price: 1500, units: 80, variable: 550, fixed: 45000 },
  special: { name: 'условный проект', price: 2000, units: 60, variable: 700, fixed: 48000 },
};

const scales = {
  small: { name: 'малый', volume: 1, expenses: 1 },
  medium: { name: 'средний', volume: 4, expenses: 3 },
  large: { name: 'крупный', volume: 12, expenses: 8 },
};

const formProfiles = [
  { key: 'ip', name: 'ИП', admin: 1500, contributions: 5000 },
  { key: 'llc', name: 'ООО', admin: 5000, contributions: 0 },
  { key: 'jsc', name: 'АО', admin: 15000, contributions: 0 },
];

const managementCosts = {
  0: { ip: 0, llc: 0, jsc: 0 },
  1: { ip: 25000, llc: 25000, jsc: 35000 },
  2: { ip: 0, llc: 40000, jsc: 60000 },
};

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

export function buildExample(answers) {
  const { name: activity, ...base } = activities[answers.activity];
  const scale = scales[answers.scale];
  const plan = {
    ...base,
    units: base.units * scale.volume,
    fixed: base.fixed * scale.expenses,
    initial: 0,
    working: 0,
    capacity: 0,
  };
  const profiles = formProfiles.map(profile => ({
    ...profile,
    admin: profile.admin * scale.expenses + managementCosts[answers.control][profile.key],
    setup: 0,
    rate: 6,
    base: 'revenue',
  }));
  return { activity, scale, plan, profiles };
}

export function compareFinances(answers, ranking) {
  const { activity, scale, plan, profiles } = buildExample(answers);
  const eligibleKeys = new Set(ranking.filter(isEligible).map(row => row.key));
  const showsPublicJointStock = eligibleKeys.has('pao');
  const rows = profiles.flatMap(profile => {
    const isPublicJointStock = profile.key === 'jsc' && showsPublicJointStock;
    const key = isPublicJointStock ? 'pao' : profile.key;
    if (!eligibleKeys.has(key)) return [];
    const name = isPublicJointStock ? 'ПАО' : profile.name;
    return [{ ...calculate(plan, profile), profile, name }];
  });
  return { activity, scale, plan, rows };
}

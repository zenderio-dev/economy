import { test, expect } from 'vitest';
import { rank, isEligible } from '../src/domain/selection.mjs';
import { buildExample, calculate, compareFinances } from '../src/domain/economics.mjs';
import { forms } from '../src/domain/forms.mjs';
import { specialProfiles } from '../src/domain/special.mjs';

const base = {
  purpose: 'business', owners: '5', risk: 'yes', personalWork: 'yes', voting: 'equal', activity: 'production',
  scale: 'small', control: '0', admin: '0', capitalAmount: '10000', market: 'private',
  growth: '0', transfer: '0', funding: 'none', farmingActivity: 'yes', cooperativeWorkFit: 'yes',
};
const example = changes => {
  const answers = { ...base, ...changes };
  const ranking = rank(answers);
  return { ...compareFinances(answers, ranking), ranking };
};

test('рекомендуемая форма присутствует первой во всех основных финансовых ветках', () => {
  const cases = [
    [{ purpose: 'business', owners: '1', activity: 'trade' }, 'ip'],
    [{ purpose: 'business', risk: 'no' }, 'llc'],
    [{ purpose: 'business', funding: 'shares' }, 'jsc'],
    [{ purpose: 'business', market: 'public', capitalAmount: '100000', publicBoard: 'yes' }, 'pao'],
    [{ purpose: 'agriculture' }, 'farm'],
    [{ purpose: 'team' }, 'coop'],
    [{ purpose: 'social', socialGoal: 'services', membership: 'no', fundingSource: 'services' }, 'ano'],
    [{ purpose: 'social', socialGoal: 'services', membership: 'no', fundingSource: 'owner', owners: '1' }, 'institution'],
    [{ purpose: 'social', socialGoal: 'charity', membership: 'no', fundingSource: 'donations' }, 'fund'],
    [{ purpose: 'social', socialGoal: 'interests', membership: 'yes', fundingSource: 'fees' }, 'association'],
    [{ purpose: 'social', socialGoal: 'movement', membership: 'yes', fundingSource: 'fees', founderType: 'citizens' }, 'publicorg'],
    [{ purpose: 'social', socialGoal: 'movement', membership: 'no', fundingSource: 'donations', founderType: 'citizens' }, 'movement'],
    [{ purpose: 'propertyGoal', sharedGoal: 'property', membership: 'yes', propertyRights: 'yes' }, 'property'],
    [{ purpose: 'propertyGoal', sharedGoal: 'needs', membership: 'yes', consumerFoundersFit: 'yes' }, 'consumer'],
  ];
  for (const [answers, key] of cases) {
    const model = example(answers);
    expect(model.ranking[0].key, key).toBe(key);
    expect(model.rows[0].key, key).toBe(key);
    expect(model.rows.map(row => row.key)).toEqual(model.ranking.filter(isEligible).map(row => row.key));
    expect(model.rows.every(row => Number.isFinite(row.net))).toBe(true);
  }
});

test('для всех специальных форм есть сценарий, неизвестные и отрицательные ответы блокируют расчёт', () => {
  const covered = new Set();
  for (const [key, profile] of Object.entries(specialProfiles)) {
    const answers = { purpose: 'specialGoal', specialType: key };
    for (const check of profile.checks) answers[`special_${check.id}`] = 'yes';
    if (profile.count) answers.special_count = String(profile.count[0]);
    const model = compareFinances(answers, rank(answers));
    expect(model.rows.map(row => row.key), key).toEqual([key]);
    expect(Number.isFinite(model.rows[0].net), key).toBe(true);
    covered.add(key);
    const field = `special_${profile.checks[0].id}`;
    for (const response of ['unknown', 'no']) {
      const invalid = { ...answers, [field]: response };
      expect(compareFinances(invalid, rank(invalid)).rows).toEqual([]);
    }
  }
  const ordinary = Object.keys(forms).filter(key => !specialProfiles[key]);
  expect(new Set([...ordinary, ...covered]).size).toBe(Object.keys(forms).length);
});

test('КФХ использует один сельхозплан с альтернативами, без случайной подстановки мастерской', () => {
  const farm = example({ purpose: 'agriculture' });
  expect(farm.activity).toBe('производство сельхозпродукции');
  expect(farm.rows.map(row => row.name)).toEqual(['КФХ', 'ООО', 'АО']);
  expect(farm.rows.map(row => row.revenue)).toEqual([120000, 120000, 120000]);
  expect(farm.rows[0].net).toBe(19300); // 120000 - 50000 - 35000 - 3500 - 5000 - 7200
  const resale = example({ purpose: 'agriculture', activity: 'trade', farmingActivity: 'no' });
  expect(resale.activity).toBe('магазин товаров');
  expect(resale.rows.some(row => row.key === 'farm')).toBe(false);
});

test('смета НКО сохраняет источник средств и не подменяет неизвестный налог нулевой ставкой', () => {
  const model = example({ purpose: 'social', socialGoal: 'charity', membership: 'no', fundingSource: 'donations' });
  expect(model.kind).toBe('budget');
  expect(model.receipts).toEqual([{ label: 'Пожертвования и гранты', amount: 120000 }]);
  const row = model.rows[0];
  expect(row.programCost).toBe(93000);
  expect(row.net).toBe(20000);
  expect(row.tax).toBeNull();
  expect(row.scenarios.map(item => item.net)).toEqual([-4000, 20000, 44000]);
  expect(example({ purpose: 'social', socialGoal: 'charity', membership: 'no', fundingSource: 'fees' }).rows).toEqual([]);
});

test('ТСН и закупочный кооператив получают разные сметы, зависящие от участников', () => {
  const property = example({ purpose: 'propertyGoal', owners: '2', sharedGoal: 'property', membership: 'yes', propertyRights: 'yes' });
  expect(property.rows[0].revenue).toBe(12000);
  expect(property.rows[0].net).toBe(1000);
  const consumer = example({ purpose: 'propertyGoal', sharedGoal: 'needs', membership: 'yes', consumerFoundersFit: 'yes' });
  expect(consumer.activity).toBe('совместная закупка для участников');
  expect(consumer.rows[0].revenue).toBe(12500);
  expect(consumer.rows[0].net).toBe(0);
});

test('размер, управление и вид деятельности меняют пример без изменения рекомендации деньгами', () => {
  const small = example({ purpose: 'team' });
  const large = example({ purpose: 'team', scale: 'large' });
  const director = example({ purpose: 'team', control: '1' });
  expect(large.plan.units).toBe(small.plan.units * 12);
  expect(large.plan.fixed).toBe(small.plan.fixed * 8);
  expect(director.rows.find(row => row.key === 'coop').profile.admin).toBe(31000);
  expect(example({ purpose: 'business', activity: 'service' }).activity).toBe('студия услуг');
});

test('при отсутствии допустимой формы нет таблицы альтернатив и есть объяснение', () => {
  const pending = example({ market: 'public', capitalAmount: '100000', publicBoard: 'unknown' });
  expect(pending.rows).toEqual([]);
  expect(pending.explanation).toMatch(/подтвердите/);
  const blocked = example({ market: 'public', capitalAmount: '100000', publicBoard: 'no' });
  expect(blocked.rows).toEqual([]);
  expect(blocked.explanation).toMatch(/противоречия/);
});

test('безубыточность проверена с обеих сторон порога; невыполнимый вклад не даёт фиктивного порога', () => {
  const { plan, profiles } = buildExample(base);
  const llc = profiles.find(row => row.key === 'llc');
  const result = calculate(plan, llc);
  expect(result.breakEven).toBe(59);
  expect(calculate({ ...plan, units: 58 }, llc).net).toBe(-120);
  expect(calculate({ ...plan, units: 59 }, llc).net).toBe(740);
  expect(calculate({ ...plan, variable: plan.price }, llc).breakEven).toBeNull();
  expect(calculate({ ...plan, units: 0 }, llc).margin).toBeNull();
});

test('КФХ и кооператив не получают автоматический максимум: управление, масштаб и учёт влияют на выбор', () => {
  for (const [purpose, key] of [['agriculture', 'farm'], ['team', 'coop']]) {
    const simple = example({ purpose });
    const complex = example({ purpose, scale: 'large', control: '2', admin: '2' });
    expect(simple.ranking[0].key).toBe(key);
    expect(simple.ranking[0].score).toBeLessThan(100);
    expect(complex.ranking.find(row => row.key === key).score).toBeLessThan(simple.ranking[0].score);
    expect(complex.ranking[0].key).not.toBe(key);
    expect(complex.rows[0].key).toBe(complex.ranking[0].key);
  }
});

test('согласует допустимые формы и финансы на 3456 комбинациях коммерческих ответов', () => {
  let checked = 0;
  for (const purpose of ['business', 'agriculture', 'team'])
    for (const activity of ['service', 'trade', 'production', 'special'])
      for (const scale of ['small', 'large'])
        for (const control of ['0', '1', '2'])
          for (const risk of ['yes', 'no'])
            for (const owners of ['1', '5', '51'])
              for (const funding of ['none', 'shares'])
                for (const market of ['private', 'public'])
                  for (const capitalAmount of ['0', '100000']) {
                  const model = example({ purpose, activity, scale, control, risk, owners, funding, market, publicBoard: 'yes', capitalAmount });
                  const allowed = model.ranking.filter(isEligible).map(row => row.key);
                  expect(model.rows.map(row => row.key)).toEqual(allowed);
                  for (const row of model.rows) {
                    expect(row.net).toBeCloseTo(row.revenue - row.operatingCost - row.tax, 6);
                    expect(Number.isFinite(row.net)).toBe(true);
                  }
                  checked += 1;
                }
  expect(checked).toBe(3456);
});

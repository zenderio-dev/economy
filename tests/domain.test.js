import assert from 'node:assert/strict';
import { test } from 'vitest';
import { isEligible, rank as rankForms } from '../src/domain/selection.mjs';
import { assessSpecial, specialProfiles } from '../src/domain/special.mjs';
import { calculate, buildExample, compareFinances } from '../src/domain/economics.mjs';
import { guidance } from '../src/domain/guidance.mjs';

const base = {
  owners: '5', risk: 'yes', personalWork: 'yes', voting: 'equal', activity: 'production',
  scale: 'small', control: '0', admin: '0', capitalAmount: '10000', market: 'private',
  growth: '0', transfer: '0', funding: 'none', farmingActivity: 'yes', cooperativeWorkFit: 'yes',
};

const rank = changes => rankForms({ ...base, ...changes });

test('проходит все профили особого статуса', () => {
  for (const [key, profile] of Object.entries(specialProfiles)) {
    const yes = Object.fromEntries(profile.checks.map(check => [`special_${check.id}`, 'yes']));
    if (profile.count) yes.special_count = String(profile.count[0]);

    assert.equal(assessSpecial(key, yes).status, 'preliminary', key);
    assert.equal(assessSpecial(key, {}).status, 'pending', key);

    for (const check of profile.checks) {
      const field = `special_${check.id}`;
      assert.equal(assessSpecial(key, { ...yes, [field]: 'no' }).status, 'blocked', field);
      assert.equal(assessSpecial(key, { ...yes, [field]: 'unknown' }).status, 'pending', field);
    }

    if (profile.count) {
      assert.equal(assessSpecial(key, { ...yes, special_count: '1' }).status, 'blocked', key);
    }
    const [result] = rank({ purpose: 'specialGoal', specialType: key, ...yes });
    assert.equal(result.assessment.status, 'preliminary', key);
    assert.ok(result.assessment.steps.length >= 3, key);
    assert.ok(result.assessment.source[1].startsWith('https://'), key);
  }
});

test('подбирает форму в основных ветках', () => {
  assert.equal(rank({ purpose: 'business', owners: '1', activity: 'trade' })[0].key, 'ip');
  assert.equal(rank({ purpose: 'team' })[0].key, 'coop');
  assert.equal(rank({ purpose: 'agriculture' })[0].key, 'farm');
  assert.equal(rank({ purpose: 'social', socialGoal: 'services', membership: 'no', fundingSource: 'services' })[0].key, 'ano');
  assert.equal(rank({ purpose: 'social', socialGoal: 'charity', membership: 'no', fundingSource: 'donations' })[0].key, 'fund');
  assert.equal(rank({ purpose: 'propertyGoal', sharedGoal: 'property', membership: 'yes', propertyRights: 'yes' })[0].key, 'property');
});

test.each([
  ['full', 'otherMembership'],
  ['limited', 'contributorLimit'],
  ['laworg', 'sameChamber'],
])('требует подтвердить новое обязательное условие для %s', (key, condition) => {
  const profile = specialProfiles[key];
  const answers = Object.fromEntries(profile.checks.map(check => [`special_${check.id}`, 'yes']));
  if (profile.count) answers.special_count = String(profile.count[0]);

  assert.equal(assessSpecial(key, { ...answers, [`special_${condition}`]: 'no' }).status, 'blocked');
  assert.equal(assessSpecial(key, { ...answers, [`special_${condition}`]: 'unknown' }).status, 'pending');
});

test('применяет ограничения до оценки и финансового сравнения', () => {
  const answers = { ...base, purpose: 'business', market: 'public', funding: 'shares', capitalAmount: '100000', publicBoard: 'yes' };
  const ranking = rankForms(answers);
  assert.equal(ranking[0].key, 'pao');
  assert.ok(ranking.find(row => row.key === 'llc').excluded.length);
  assert.ok(ranking.find(row => row.key === 'ip').excluded.length);
  assert.deepEqual(compareFinances(answers, ranking).rows.map(row => row.name), ['ПАО']);
  assert.ok(rank({ purpose: 'business', market: 'public' }).every(row => row.excluded.length));
});

test('отличает препятствие ПАО от неподтверждённого состава органа управления', () => {
  const answers = { ...base, purpose: 'business', market: 'public', capitalAmount: '100000' };
  const unknown = { ...answers, publicBoard: 'unknown' };
  const ranking = rankForms(unknown);
  assert.equal(ranking[0].key, 'pao');
  assert.match(ranking[0].pending[0], /коллегиальный орган/);
  assert.ok(ranking.every(row => !isEligible(row)));
  assert.deepEqual(compareFinances(unknown, ranking).rows, []);
  const [blocked] = rankForms({ ...answers, publicBoard: 'no' }).filter(row => row.key === 'pao');
  assert.match(blocked.excluded[0], /пяти/);
});

test('финансовая модель воспроизводит контрольный расчёт', () => {
  const { plan, profiles } = buildExample(base);
  assert.equal(calculate(plan, profiles[0]).net, 17_300);
});

test('исключает КФХ и производственный кооператив, когда нужны акции', () => {
  for (const [purpose, key] of [['agriculture', 'farm'], ['team', 'coop']]) {
    const rows = rank({ purpose, funding: 'shares' });
    assert.equal(rows[0].key, 'jsc');
    assert.ok(rows.find(row => row.key === key).excluded.some(reason => /акци/i.test(reason)));
  }
});

test('требует подтвердить состав учредителей общественного объединения', () => {
  const answers = { purpose: 'social', socialGoal: 'movement', membership: 'yes', fundingSource: 'fees', founderType: 'mixed' };
  assert.ok(rank({ ...answers, owners: '3' }).find(row => row.key === 'publicorg').excluded.length);
  const fourFounders = { ...answers, owners: '4' };
  assert.ok(rank(fourFounders).some(row => row.key === 'publicorg' && row.pending.length));
  assert.ok(rank({ ...fourFounders, publicFoundersFit: 'no' }).every(row => !isEligible(row)));
  assert.equal(rank({ ...fourFounders, publicFoundersFit: 'yes' }).find(isEligible)?.key, 'publicorg');
});

test('учитывает число участников и подтверждение условий для общего имущества и закупок', () => {
  const property = { purpose: 'propertyGoal', sharedGoal: 'property', membership: 'yes', propertyRights: 'yes' };
  assert.ok(rank({ ...property, owners: '1' }).every(row => !isEligible(row)));
  const [unknown] = rank({ ...property, owners: '2', propertyRights: 'unknown' });
  assert.equal(unknown.key, 'property');
  assert.match(unknown.pending[0], /права/);

  const consumer = { purpose: 'propertyGoal', sharedGoal: 'needs', membership: 'yes' };
  assert.ok(rank({ ...consumer, owners: '1', consumerFoundersFit: 'yes' }).every(row => !isEligible(row)));
  assert.ok(rank({ ...consumer, owners: '5' })[0].pending.length);
  assert.equal(rank({ ...consumer, owners: '5', consumerFoundersFit: 'yes' }).find(isEligible)?.key, 'consumer');
});

test('не рекомендует кооператив с голосованием по паям и КФХ без сельхоздеятельности', () => {
  const cooperative = { purpose: 'team', capitalAmount: '0', voting: 'capital' };
  const rows = rank(cooperative);
  assert.ok(rows.every(row => !isEligible(row)));
  assert.match(rows.find(row => row.key === 'coop').excluded[0], /один голос/);
  const uncertainCoop = rank({ ...cooperative, voting: 'equal', cooperativeWorkFit: 'unknown' })[0];
  assert.equal(uncertainCoop.key, 'coop');
  assert.match(uncertainCoop.pending[0], /лично работающих/);

  const agriculture = { purpose: 'agriculture', activity: 'trade' };
  assert.ok(rank({ ...agriculture, farmingActivity: 'no' }).find(row => row.key === 'farm').excluded.length);
  assert.ok(rank({ ...agriculture, farmingActivity: 'unknown' }).find(row => row.key === 'farm').pending.length);
  assert.equal(rank({ ...agriculture, farmingActivity: 'yes' }).find(isEligible)?.key, 'farm');
});

test('карточки обычных форм содержат следующие шаги и источник', () => {
  for (const key of ['ip', 'llc', 'jsc', 'pao', 'coop', 'farm', 'ano', 'fund', 'association', 'publicorg', 'movement', 'institution', 'property', 'consumer']) {
    assert.ok(guidance[key].steps.length >= 3, key);
    assert.ok(guidance[key].source[1].startsWith('https://'), key);
  }
});

test('проверяет состав учредителей и ограничения по цели', () => {
  assert.ok(rank({ purpose: 'social', socialGoal: 'interests', membership: 'yes', fundingSource: 'fees', owners: '1' })
    .find(row => row.key === 'association').excluded.length);
  assert.ok(rank({ purpose: 'social', socialGoal: 'services', membership: 'no', fundingSource: 'owner', owners: '2' })
    .find(row => row.key === 'institution').excluded.length);
  assert.ok(rank({ purpose: 'social', socialGoal: 'movement', membership: 'yes', fundingSource: 'fees', owners: '2' })
    .find(row => row.key === 'publicorg').excluded.length);
  assert.ok(rank({ purpose: 'social', socialGoal: 'services', membership: 'no', fundingSource: 'services', distribution: 'yes' })
    .every(row => row.excluded.length));
  assert.ok(rank({ purpose: 'propertyGoal', sharedGoal: 'property', membership: 'yes', propertyRights: 'no' })
    .every(row => row.excluded.length));
});

test('допускает к сравнению только НКО с подходящим назначением', () => {
  const allowed = {
    services: ['ano', 'institution'],
    charity: ['fund'],
    interests: ['association'],
    movement: ['publicorg', 'movement'],
  };

  for (const [socialGoal, keys] of Object.entries(allowed)) {
    for (const membership of ['yes', 'no']) {
      for (const fundingSource of ['fees', 'services', 'donations', 'owner']) {
        for (const owners of ['1', '2', '3', '5']) {
          for (const distribution of ['yes', 'no']) {
            const rows = rank({ purpose: 'social', socialGoal, membership, fundingSource, owners, distribution });
            assert.ok(rows.filter(isEligible).every(row => keys.includes(row.key)), socialGoal);
          }
        }
      }
    }
  }
});

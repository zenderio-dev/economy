// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { Results } from '../src/results/Results.jsx';
import { rank } from '../src/domain/selection.mjs';

afterEach(cleanup);
const base = {
  owners: '5', risk: 'yes', personalWork: 'yes', voting: 'equal', activity: 'production',
  scale: 'small', control: '0', admin: '0', capitalAmount: '10000', market: 'private',
  growth: '0', transfer: '0', funding: 'none', farmingActivity: 'yes', cooperativeWorkFit: 'yes',
};

test.each([
  [{ purpose: 'agriculture' }, 'КФХ', 'производство сельхозпродукции'],
  [{ purpose: 'team' }, 'Производственный кооператив', 'совместный труд: мастерская'],
  [{ purpose: 'business', funding: 'shares' }, 'АО', 'мастерская'],
  [{ purpose: 'business', market: 'public', publicBoard: 'yes', capitalAmount: '100000' }, 'ПАО', 'мастерская'],
  [{ purpose: 'social', socialGoal: 'services', membership: 'no', fundingSource: 'services' }, 'АНО', 'некоммерческие услуги'],
  [{ purpose: 'social', socialGoal: 'charity', membership: 'no', fundingSource: 'donations' }, 'Общественно полезный фонд', 'общественно полезная программа'],
  [{ purpose: 'propertyGoal', sharedGoal: 'property', membership: 'yes', propertyRights: 'yes' }, 'ТСН', 'совместное содержание недвижимости'],
  [{ purpose: 'propertyGoal', sharedGoal: 'needs', membership: 'yes', consumerFoundersFit: 'yes' }, 'Потребительский кооператив', 'совместная закупка для участников'],
])('показывает согласованный результат и расчёт для %s', (changes, name, scenario) => {
  const answers = { ...base, ...changes };
  const { container } = render(<Results answers={answers} ranking={rank(answers)} />);
  const finance = container.querySelector('.finance-panel');
  expect(within(finance).getByText(`Проект: ${scenario}.`)).toBeTruthy();
  const headers = within(screen.getByRole('table')).getAllByRole('columnheader');
  expect(headers[1].textContent).toBe(`${name}Рекомендовано по анкете`);
  expect(within(finance).getByRole('heading', { name: `Что это значит для ${name}` })).toBeTruthy();
  expect(within(finance).getByText('На 20% меньше')).toBeTruthy();
});

test('при противоречии не показывает финансовую таблицу чужой формы и объясняет действие', () => {
  const answers = { ...base, purpose: 'business', market: 'public', capitalAmount: '100000', publicBoard: 'no' };
  render(<Results answers={answers} ranking={rank(answers)} />);
  expect(screen.getByRole('heading', { name: 'При этих условиях подходящей формы нет' })).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Вернуться к ответам' }).getAttribute('href')).toBe('#project-questionnaire');
  expect(screen.getByText(/Сначала устраните противоречия/)).toBeTruthy();
  expect(screen.queryByRole('table')).toBeNull();
});

test('в смете неизвестный налог явно указан и не обозначен нулём', () => {
  const answers = { ...base, purpose: 'social', socialGoal: 'charity', membership: 'no', fundingSource: 'donations' };
  render(<Results answers={answers} ranking={rank(answers)} />);
  const row = screen.getByRole('row', { name: /Налоги — нужен отдельный расчёт/ });
  expect(within(row).getByRole('cell').textContent).toBe('Не рассчитаны');
  expect(screen.getByRole('rowheader', { name: 'Остаток до возможных налогов' })).toBeTruthy();
});

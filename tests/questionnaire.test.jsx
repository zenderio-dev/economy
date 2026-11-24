// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test } from 'vitest';
import { App } from '../src/App.jsx';
import { specialProfiles } from '../src/domain/special.mjs';
import { sectionsByPurpose } from '../src/questionnaire/fields.js';

afterEach(cleanup);

function trigger(label) {
  return screen.getByRole('button', { name: name => name.includes(label) });
}

async function choose(user, label, option) {
  await user.click(trigger(label));
  await user.click(screen.getByRole('option', { name: option, exact: true }));
}

function answerNumber(label, value) {
  fireEvent.change(screen.getByRole('spinbutton', { name: label }), { target: { value } });
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: 'Получить рекомендацию' }));
}

test('требует ответы и показывает рекомендацию и финансовый пример', async () => {
  const user = userEvent.setup();
  render(<App />);

  submit();
  expect(screen.queryByText(/^Рекомендация:/)).toBeNull();
  expect(document.activeElement).toBe(trigger('Чем будете заниматься?'));

  for (const [label, option] of [
    ['Чем будете заниматься?', 'Продавать товары'],
    ['Какой масштаб планируете?', 'Малый'],
    ['Нужны ли инвесторы?', 'Начнём на свои средства'],
    ['Готовы отвечать по долгам личным имуществом?', 'Да, готовы'],
    ['Кто будет управлять?', 'Владелец'],
    ['Как смогут войти новые владельцы?', 'Состав постоянный'],
    ['Какой учёт готовы вести?', 'Минимум формальностей'],
    ['Как планируете расти?', 'Самостоятельно'],
  ]) await choose(user, label, option);

  answerNumber('Сколько будет владельцев или учредителей?', '0');
  submit();
  expect(screen.queryByText(/^Рекомендация:/)).toBeNull();

  answerNumber('Сколько будет владельцев или учредителей?', '1');
  submit();
  expect(screen.getByRole('heading', { name: /^Рекомендация: ИП/ })).toBeTruthy();
  expect(document.activeElement).toBe(screen.getByRole('region', { name: /^Рекомендация: ИП/ }));
  expect(screen.getByRole('table')).toBeTruthy();

  await choose(user, 'Готовы отвечать по долгам личным имуществом?', 'Нет, хотим ограничить риск');
  expect(screen.queryByText(/^Рекомендация:/)).toBeNull();
  expect(screen.queryByRole('table')).toBeNull();
  submit();
  expect(screen.getByRole('heading', { name: /^Рекомендация: ООО/ })).toBeTruthy();

  await choose(user, 'Планируете публично размещать акции?', 'Да');
  answerNumber('Бюджет на уставный капитал, ₽', '100000');
  await choose(user, 'Готовы сформировать коллегиальный орган управления из пяти и более человек?', 'Нужно уточнить');
  submit();
  expect(screen.getByRole('heading', { name: 'Нужно уточнить условия' })).toBeTruthy();
  expect(screen.queryByRole('table')).toBeNull();
}, 15000);

test('выбирает с клавиатуры и возвращает фокус при закрытии', async () => {
  const user = userEvent.setup();
  render(<App />);
  const control = trigger('Чем будете заниматься?');
  control.focus();
  await user.keyboard('{ArrowDown}');
  expect(screen.getByRole('listbox')).toBeTruthy();
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('listbox')).toBeNull();
  await waitFor(() => expect(document.activeElement).toBe(control));

  await user.keyboard('{ArrowDown}{Home}{ArrowDown}{Enter}');
  expect(control.textContent).toContain('Продавать товары');
  expect(screen.queryByRole('listbox')).toBeNull();
});

test('условия скрытой ветки не влияют на результат', async () => {
  const user = userEvent.setup();
  const { container } = render(<App />);

  await user.click(screen.getByRole('radio', { name: 'Управлять общим имуществом или делать совместные закупки' }));
  await choose(user, 'Что хотите организовать?', 'Управление недвижимостью');
  answerNumber('Сколько будет владельцев или учредителей?', '2');
  await choose(user, 'Нужно ли постоянное членство?', 'Да');
  await choose(user, 'Участники владеют этой недвижимостью?', 'Нет');
  submit();
  expect(screen.getByRole('heading', { name: /подходящей формы нет/ })).toBeTruthy();
  expect(container.querySelector('details').open).toBe(true);

  await choose(user, 'Участники владеют этой недвижимостью?', 'Нужно уточнить');
  submit();
  expect(screen.getByRole('heading', { name: 'Нужно уточнить условия' })).toBeTruthy();
  expect(screen.getByText('Подтвердите права участников на недвижимость.')).toBeTruthy();

  await choose(user, 'Что хотите организовать?', 'Совместные закупки или другие общие потребности');
  expect(screen.queryByRole('button', { name: /Участники владеют этой недвижимостью/ })).toBeNull();
  await choose(user, 'Число и состав учредителей соответствуют требованиям выбранного вида кооператива?', 'Да');
  submit();
  expect(screen.getByRole('heading', { name: /^Рекомендация: Потребительский кооператив/ })).toBeTruthy();
});

test.each(sectionsByPurpose.specialGoal[0].fields[0].options)('принимает специальную анкету %s', async (key, title) => {
  const user = userEvent.setup();
  const { container } = render(<App />);
  const profile = specialProfiles[key];

  await user.click(screen.getByRole('radio', { name: 'Создать организацию с особым статусом' }));
  await choose(user, 'Какая форма вас интересует?', title);
  for (const check of profile.checks) await choose(user, check.label, 'Да');
  if (profile.count) answerNumber('Сколько будет участников?', String(profile.count[0]));
  submit();

  const result = container.querySelector('.result-panel');
  expect(within(result).getByRole('heading', { name: 'Базовые условия предварительно выполнены' })).toBeTruthy();
  expect(screen.getByRole('table')).toBeTruthy();
  expect(screen.getByText(/Выбранная форма:/)).toBeTruthy();
  expect(screen.queryByText(/NaN|undefined/)).toBeNull();
});

test('очищает ответы специальных форм при смене профиля', async () => {
  const user = userEvent.setup();
  render(<App />);
  const [firstProfile, secondProfile] = sectionsByPurpose.specialGoal[0].fields[0].options;

  await user.click(screen.getByRole('radio', { name: 'Создать организацию с особым статусом' }));
  await choose(user, 'Какая форма вас интересует?', firstProfile[1]);
  const { label } = specialProfiles[firstProfile[0]].checks[0];
  await choose(user, label, 'Да');
  await choose(user, 'Какая форма вас интересует?', secondProfile[1]);
  await choose(user, 'Какая форма вас интересует?', firstProfile[1]);
  expect(trigger(label).textContent).toBe('Выберите вариант');

  await user.click(screen.getByRole('radio', { name: 'Продавать товары или оказывать услуги' }));
  expect(screen.queryByRole('button', { name: /Какая форма вас интересует/ })).toBeNull();
  expect(trigger('Чем будете заниматься?')).toBeTruthy();
});

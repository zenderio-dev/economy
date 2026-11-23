import { compareFinances } from '../domain/economics.mjs';

const commercialGoals = new Set(['business', 'agriculture', 'team']);
const number = new Intl.NumberFormat('ru-RU');
const currency = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

const metrics = [
  ['Выручка', row => row.revenue],
  ['Общие расходы бизнеса', (_, plan) => plan.fixed + plan.units * plan.variable],
  ['Учёт и управление', row => row.profile.admin],
  ['Условные взносы', row => row.profile.contributions],
  ['Условный налог', row => row.tax],
  ['Финансовый результат', row => row.net],
];

function describeComparison(rows) {
  if (rows.length === 1) return `По вашим условиям расчёт доступен для одной формы: ${rows[0].name}.`;

  const [highest, next] = [...rows].sort((left, right) => right.net - left.net);
  if (highest.net === next.net) {
    const tied = rows.filter(row => row.net === highest.net).map(row => row.name);
    return `Лучший результат одинаков у следующих форм: ${tied.join(', ')}.`;
  }
  return `В этом примере результат у ${highest.name} выше, чем у ${next.name}, на ${currency.format(highest.net - next.net)}.`;
}

export function FinanceExample({ answers, ranking }) {
  if (!commercialGoals.has(answers.purpose)) return null;

  const { activity, scale, plan, rows } = compareFinances(answers, ranking);
  if (!rows.length) return null;

  return (
    <section className="panel finance-panel" aria-labelledby="finance-title">
      <h2 id="finance-title">Финансовый пример за месяц</h2>
      <p>
        Проект: {activity}, масштаб: {scale.name}. Продажи: {number.format(plan.units)} по {currency.format(plan.price)}.
        {' '}Расходы на единицу: {currency.format(plan.variable)}. Постоянные расходы: {currency.format(plan.fixed)}.
      </p>
      <div className="table-wrap" role="region" aria-label="Финансовые показатели за месяц" tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th scope="col">Показатель</th>
              {rows.map(row => <th key={row.name} scope="col">{row.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {metrics.map(([label, read], index) => (
              <tr key={label} className={index === metrics.length - 1 ? 'finance-total' : undefined}>
                <th scope="row">{label}</th>
                {rows.map(row => <td key={row.name}>{currency.format(read(row, plan))}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>{describeComparison(rows)}</p>
      <p className="finance-caption">
        Для сравнения ИП, ООО и АО используются одинаковые продажи и условный налог 6% от выручки.
        Взносы и расходы на управление взяты для примера. Рейтинг формы рассчитывается отдельно по ответам анкеты.
      </p>
    </section>
  );
}

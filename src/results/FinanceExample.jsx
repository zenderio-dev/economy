import { compareFinances } from '../domain/economics.mjs';

const number = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
const currency = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 });
const cash = value => value === null ? 'Не рассчитаны' : currency.format(value);

function describeComparison(rows, kind, selectedOnly) {
  if (selectedOnly) return 'Показан пример выбранной вами формы после предварительной проверки её условий. Другие формы здесь не ранжируются.';
  if (rows.length === 1) return 'По вашим ответам подходит одна форма — показан её собственный пример.';
  const [highest, next] = [...rows].sort((left, right) => right.net - left.net);
  if (highest.net === next.net) return 'Наибольший остаток в этом примере одинаков у нескольких форм.';
  return `При этих допущениях остаток ${kind === 'budget' ? 'до возможных налогов ' : ''}у ${highest.name} выше, чем у ${next.name}, на ${cash(highest.net - next.net)}. Это сравнение расходов, а не новая рекомендация формы.`;
}

function ScenarioSummary({ example, row }) {
  const commercial = example.kind === 'commercial';
  return (
    <div className="finance-summary">
      <h3>Что это значит для {row.name}</h3>
      {commercial ? (
        <p>
          {row.net >= 0 ? 'После модельных расходов остаётся' : 'Не хватает на покрытие модельных расходов'} {cash(Math.abs(row.net))}.
          {' '}Минимум для покрытия этих расходов: {row.breakEven === null ? 'не достигается при данном вкладе с продажи' : `${number.format(row.breakEven)} продаж`}
          . Доля остатка в выручке: {row.margin === null ? 'не определена' : `${number.format(row.margin)}%`}.
        </p>
      ) : (
        <p>
          {row.net >= 0 ? `Плановые поступления покрывают расходы; остаётся ${cash(row.net)} до возможных налогов.` : `В смете не хватает ${cash(row.fundingGap)} ещё до возможных налогов.`}
          {' '}Покрытие расходов: {row.coverage === null ? 'не определено' : `${number.format(row.coverage)}%`}.
          {' '}Остаток используется по назначению средств и правилам организации.
        </p>
      )}
      <h3>Если {commercial ? 'продаж' : 'поступлений'} будет меньше или больше</h3>
      <p className="finance-caption">
        {commercial ? 'Цена, переменные расходы на продажу и постоянные расходы не меняются.' : 'Расходы и объём задач сохраняются, меняются только поступления. Налоги здесь не рассчитаны.'}
      </p>
      <div className="scenario-grid">
        {row.scenarios.map((scenario, index) => (
          <div className="scenario-card" key={index}>
            <strong>{['На 20% меньше', 'Базовый пример', 'На 20% больше'][index]}</strong>
            <p>{commercial ? `${number.format(scenario.volume)} продаж` : `Поступления: ${cash(scenario.revenue)}`}</p>
            <p>{scenario.net < 0 ? 'Дефицит' : 'Остаток'}: {cash(Math.abs(scenario.net))}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FinanceExample({ answers, ranking }) {
  const example = compareFinances(answers, ranking);
  if (!example.rows.length) return (
    <section className="panel finance-panel" aria-labelledby="finance-title">
      <h2 id="finance-title">Почему пока нет финансового примера</h2>
      <p>{example.explanation}</p>
    </section>
  );
  const { kind, activity, scale, plan, rows, recommendedKey } = example;
  const commercial = kind === 'commercial';
  const selectedOnly = answers.purpose === 'specialGoal';
  const recommended = rows.find(row => row.key === recommendedKey);
  const metrics = commercial ? [
    ['Выручка от продаж', row => row.revenue],
    ['Материалы и другие переменные расходы', () => plan.units * plan.variable],
    ['Постоянные расходы деятельности', () => plan.fixed],
    ['Учёт и управление', row => row.profile.admin],
    ['Условный резерв на взносы', row => row.profile.contributions],
    ['Условная налоговая нагрузка', row => row.tax],
    ['Остаток после модельных расходов', row => row.net],
  ] : [
    ['Плановые поступления', row => row.revenue],
    ['Программа и содержание', row => row.programCost],
    ['Учёт и управление', row => row.profile.admin],
    ['Налоги — нужен отдельный расчёт', row => row.tax],
    ['Остаток до возможных налогов', row => row.net],
  ];
  return (
    <section className="panel finance-panel" aria-labelledby="finance-title">
      <h2 id="finance-title">{commercial ? 'Финансовый пример за месяц' : 'Бюджет деятельности за месяц'}</h2>
      <p><strong>Проект: {activity}.</strong> {example.explanation}</p>
      <p className="finance-recommendation">{selectedOnly ? 'Выбранная форма' : 'Рекомендовано по анкете'}: <strong>{recommended.name}</strong>. {selectedOnly ? 'Базовые условия предварительно подтверждены вашими ответами.' : 'Эта форма включена в расчёт и стоит первой.'}</p>
      {commercial && (
        <p>Масштаб: {scale.name}. Продажи: {number.format(plan.units)} по {cash(plan.price)}.
          {' '}Расходы на единицу: {cash(plan.variable)}. Постоянные расходы: {cash(plan.fixed)}.</p>
      )}
      {rows.length > 1 && <p className="finance-caption table-hint">Прокрутите таблицу влево или вправо, чтобы увидеть все формы.</p>}
      <div className="table-wrap" role="region" aria-label="Финансовые показатели за месяц" tabIndex={0}>
        <table>
          <thead><tr><th scope="col">Показатель</th>{rows.map(row => (
            <th key={row.key} scope="col" className={row.key === recommendedKey ? 'recommended-column' : undefined}>
              {row.name}{row.key === recommendedKey && <small className="recommendation-label">{selectedOnly ? 'Выбранная форма' : 'Рекомендовано по анкете'}</small>}
            </th>
          ))}</tr></thead>
          <tbody>{metrics.map(([label, read], index) => (
            <tr key={label} className={index === metrics.length - 1 ? 'finance-total' : undefined}>
              <th scope="row">{label}</th>{rows.map(row => <td key={row.key}>{cash(read(row))}</td>)}
            </tr>
          ))}</tbody>
        </table>
      </div>
      <p>{describeComparison(rows, kind, selectedOnly)}</p>
      <ScenarioSummary example={example} row={recommended} />
      <details className="finance-assumptions">
        <summary>Откуда взяты суммы и что учтено</summary>
        {!commercial && <>
          <h3>Поступления — одинаковый план для показанных форм</h3>
          <ul>{example.receipts.map(item => <li key={item.label}>{item.label}: {cash(item.amount)}</li>)}</ul>
          <h3>Расходы на задачи и содержание</h3>
          <ul>{example.spending.map(item => <li key={item.label}>{item.label}: {cash(item.amount)}</li>)}</ul>
        </>}
        <h3>Организационные расходы по формам</h3>
        <ul>{rows.map(row => <li key={row.key}><strong>{row.name}: {cash(row.profile.admin)}.</strong> {row.profile.note}</li>)}</ul>
        <h3>Как считается результат</h3>
        <p>{commercial
          ? 'Выручка = цена × продажи. Остаток = выручка − переменные расходы − постоянные расходы − учёт и управление − условные взносы − условная налоговая нагрузка. Порог продаж = все постоянные расходы / (цена − расход на единицу − 6% цены), с округлением вверх.'
          : 'Остаток = все плановые поступления − расходы на программу и содержание − учёт и управление. Дефицит = недостающая сумма при отрицательном остатке. Покрытие = поступления / все модельные расходы × 100%.'}</p>
        <ul>{example.caveats.map(note => <li key={note}>{note}</li>)}</ul>
      </details>
      <p className="finance-caption">Рейтинг формы определяется условиями анкеты. Больший денежный остаток не отменяет ограничений и не означает, что форма лучше подходит вашей цели.</p>
    </section>
  );
}

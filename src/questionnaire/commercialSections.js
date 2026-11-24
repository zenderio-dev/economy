import { confirmationOptions, owners } from './commonFields.js';

const commercialDetails = {
  title: 'Деятельность и участники',
  fields: [
    {
      name: 'activity',
      label: 'Чем будете заниматься?',
      options: [
        ['service', 'Оказывать услуги'],
        ['trade', 'Продавать товары'],
        ['production', 'Производить товары'],
        ['special', 'Особые требования или пока не знаю'],
      ],
    },
    {
      name: 'scale',
      label: 'Какой масштаб планируете?',
      options: [['small', 'Малый'], ['medium', 'Средний'], ['large', 'Крупный']],
    },
    owners,
    {
      name: 'funding',
      label: 'Нужны ли инвесторы?',
      help: 'Доля — участие в ООО; акции — ценные бумаги АО. Выпуск акций не означает их публичное размещение.',
      options: [['none', 'Начнём на свои средства'], ['partners', 'Предложим доли'], ['shares', 'Выпустим акции']],
    },
    {
      name: 'risk',
      label: 'Готовы отвечать по долгам личным имуществом?',
      options: [['yes', 'Да, готовы'], ['no', 'Нет, хотим ограничить риск']],
    },
  ],
};

const governance = {
  title: 'Управление и капитал',
  fields: [
    {
      name: 'control',
      label: 'Кто будет управлять?',
      options: [['0', 'Владелец'], ['1', 'Директор'], ['2', 'Совет директоров']],
    },
    {
      name: 'transfer',
      label: 'Как смогут войти новые владельцы?',
      options: [['0', 'Состав постоянный'], ['1', 'Получат долю'], ['2', 'Получат акции']],
    },
    { name: 'capitalAmount', label: 'Бюджет на уставный капитал, ₽', type: 'number', min: 0, max: 1_000_000_000, step: 1 },
    {
      name: 'market',
      label: 'Планируете публично размещать акции?',
      help: 'Публично — предлагать акции заранее не определённому кругу инвесторов. Для конкретного круга участников можно рассмотреть непубличное АО.',
      options: [['private', 'Нет'], ['public', 'Да']],
    },
    {
      name: 'publicBoard',
      label: 'Готовы сформировать коллегиальный орган управления из пяти и более человек?',
      help: 'Для ПАО это обязательное условие. Исполнительное управление можно поручить директору.',
      options: confirmationOptions,
      when: ({ market }) => market === 'public',
    },
    {
      name: 'admin',
      label: 'Какой учёт готовы вести?',
      help: 'Более простой учёт — предпочтение, а не освобождение от обязательных документов выбранной формы.',
      options: [['0', 'Минимум формальностей'], ['1', 'Корпоративный учёт'], ['2', 'Учёт с регистратором']],
    },
    {
      name: 'growth',
      label: 'Как планируете расти?',
      options: [['0', 'Самостоятельно'], ['1', 'С партнёрами'], ['2', 'Через выпуск акций']],
    },
  ],
};

const personalWork = {
  name: 'personalWork',
  label: 'Будут ли члены хозяйства лично участвовать в его деятельности?',
  options: [['yes', 'Да'], ['no', 'Нет']],
};

const farmingActivity = {
  name: 'farmingActivity',
  label: 'Будет ли проект вести хозяйственную деятельность в области сельского хозяйства?',
  help: 'Например, выращивать сельхозпродукцию. Одна лишь перепродажа чужих товаров не подтверждает это условие.',
  options: confirmationOptions,
};

const cooperativeWork = {
  name: 'cooperativeWorkFit',
  label: 'Будете соблюдать требование к личному труду членов кооператива?',
  help: 'Число членов без личного трудового участия не должно превышать четверти от числа лично работающих членов.',
  options: confirmationOptions,
};

export const commercialSections = {
  business: [commercialDetails, governance],
  agriculture: [commercialDetails, { ...governance, fields: [farmingActivity, personalWork, ...governance.fields] }],
  team: [commercialDetails, {
    ...governance,
    fields: [
      cooperativeWork,
      {
        name: 'voting',
        label: 'Как хотите принимать решения?',
        options: [['equal', 'Один голос у каждого'], ['capital', 'Голоса зависят от доли']],
      },
      ...governance.fields,
    ],
  }],
};

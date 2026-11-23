import { owners } from './commonFields.js';

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
      options: [['private', 'Нет'], ['public', 'Да']],
    },
    {
      name: 'admin',
      label: 'Какой учёт готовы вести?',
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
  label: 'Будут ли владельцы сами работать в проекте?',
  options: [['yes', 'Большинство участвует лично'], ['no', 'Работу выполняют сотрудники']],
};

export const commercialSections = {
  business: [commercialDetails, governance],
  agriculture: [commercialDetails, { ...governance, fields: [personalWork, ...governance.fields] }],
  team: [commercialDetails, {
    ...governance,
    fields: [
      personalWork,
      {
        name: 'voting',
        label: 'Как хотите принимать решения?',
        options: [['equal', 'Один голос у каждого'], ['capital', 'Голоса зависят от доли']],
      },
      ...governance.fields,
    ],
  }],
};

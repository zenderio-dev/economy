import { forms } from '../domain/forms.mjs';
import { specialProfiles } from '../domain/special.mjs';
import { owners } from './commonFields.js';

const membership = {
  name: 'membership',
  label: 'Нужно ли постоянное членство?',
  options: [['yes', 'Да'], ['no', 'Нет']],
};

const socialDetails = {
  title: 'Задача и учредители',
  fields: [
    {
      name: 'socialGoal',
      label: 'В чём главная задача?',
      options: [
        ['services', 'Оказывать услуги'],
        ['charity', 'Собирать средства на общественно полезные цели'],
        ['interests', 'Представлять интересы участников'],
        ['movement', 'Объединять людей для общественной деятельности'],
      ],
      wide: true,
    },
    owners,
    membership,
    {
      name: 'founderType',
      label: 'Кто учреждает организацию?',
      options: [['citizens', 'Граждане'], ['legal', 'Организации'], ['mixed', 'Граждане и организации']],
    },
    {
      name: 'fundingSource',
      label: 'Откуда поступят основные средства?',
      options: [['donations', 'Пожертвования и гранты'], ['fees', 'Членские взносы'], ['services', 'Оплата услуг'], ['owner', 'Средства собственника']],
    },
    {
      name: 'distribution',
      label: 'Хотите распределять прибыль между учредителями?',
      options: [['no', 'Нет, средства идут на цели организации'], ['yes', 'Да, учредители получают часть прибыли']],
      wide: true,
    },
  ],
};

const sharedDetails = {
  title: 'Общие потребности',
  fields: [
    {
      name: 'sharedGoal',
      label: 'Что хотите организовать?',
      options: [['property', 'Управление недвижимостью'], ['needs', 'Совместные закупки или другие общие потребности']],
      wide: true,
    },
    owners,
    membership,
    {
      name: 'propertyRights',
      label: 'Участники владеют этой недвижимостью?',
      options: [['yes', 'Да'], ['no', 'Нет'], ['unknown', 'Нужно уточнить']],
      when: ({ sharedGoal }) => sharedGoal === 'property',
    },
  ],
};

const specialNames = {
  unitary: 'Унитарное предприятие',
  laworg: 'Коллегия адвокатов',
};

const specialDetails = {
  title: 'Особый статус',
  fields: [
    {
      name: 'specialType',
      label: 'Какая форма вас интересует?',
      wide: true,
      options: Object.keys(specialProfiles).map(key => [key, specialNames[key] ?? forms[key][0]]),
    },
  ],
};

export const organizationSections = {
  social: [socialDetails],
  propertyGoal: [sharedDetails],
  specialGoal: [specialDetails],
};

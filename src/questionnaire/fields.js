import { commercialSections } from './commercialSections.js';
import { organizationSections } from './organizationSections.js';

export const purposeOptions = [
  ['business', 'Продавать товары или оказывать услуги'],
  ['agriculture', 'Развивать сельское хозяйство'],
  ['team', 'Вместе производить товары или выполнять работы'],
  ['social', 'Решать общественную задачу'],
  ['propertyGoal', 'Управлять общим имуществом или делать совместные закупки'],
  ['specialGoal', 'Создать организацию с особым статусом'],
];

export const initialAnswers = { purpose: 'business', capitalAmount: '10000', market: 'private' };

export const sectionsByPurpose = { ...commercialSections, ...organizationSections };

import { assessSpecial, specialProfiles } from './special.mjs';

export { forms } from './forms.mjs';

const controlRatings = {
  0: [1, .8, .45],
  1: [.4, 1, .9],
  2: [0, .75, 1],
};

const adminRatings = {
  0: [1, .65, .25],
  1: [.8, 1, .65],
  2: [.65, .85, 1],
};

const activityRatings = {
  service: [1, .9, .6],
  trade: [1, .9, .6],
  production: [.55, 1, .8],
  special: [.5, .5, .5],
};

const scaleRatings = {
  small: [1, .9, .55],
  medium: [.6, 1, .85],
  large: [.35, .8, 1],
};

const capitalFormatter = new Intl.NumberFormat('ru-RU');

const matchingMessages = rules => rules.filter(([matches]) => matches).map(([, message]) => message);
const isUnconfirmed = answer => answer !== 'yes' && answer !== 'no';

function candidate(key, points, limits, unanswered = []) {
  const score = points.reduce((sum, { delta }) => sum + delta, 0);
  return {
    key,
    score: Math.round(score * 10) / 10,
    excluded: matchingMessages(limits),
    pending: matchingMessages(unanswered),
    reasons: points.map(({ label, delta }) => `${delta > 0 ? '+' : ''}${delta} · ${label}`),
    top: points.filter(({ delta }) => delta > 0)
      .sort((left, right) => right.delta - left.delta)
      .slice(0, 2)
      .map(({ label }) => label),
  };
}

function goalCandidate(key, criteria, limits, unanswered) {
  const points = criteria.filter(([matches]) => matches).map(([, delta, label]) => ({ delta, label }));
  return candidate(key, points, limits, unanswered);
}

export function isEligible(row) {
  if (row.assessment) return row.assessment.status === 'preliminary';
  return row.excluded.length === 0 && row.pending.length === 0;
}

function theProjectRequiresShares({ funding, transfer, growth, market }) {
  return funding === 'shares' || transfer === '2' || growth === '2' || market === 'public';
}

function businessCandidates(answers) {
  const { funding, transfer, growth, risk, capitalAmount, market, control, admin, activity, scale } = answers;
  const owners = Number(answers.owners);
  const needsShares = theProjectRequiresShares(answers);
  const needsCoOwnership = owners > 1 || funding === 'partners' || transfer === '1' || growth === '1';
  const limitsPersonalRisk = risk === 'no';
  const capital = Number(capitalAmount);
  const publicOffering = market === 'public';
  const minimumShareCapital = publicOffering ? 100_000 : 10_000;

  const limits = {
    ip: [
      [needsCoOwnership, 'Нужно юридически оформить совладение.'],
      [needsShares, 'Нужны акции.'],
      [limitsPersonalRisk, 'Указано требование ограничить личный имущественный риск.'],
      [control === '2', 'Указан совет директоров.'],
    ],
    llc: [
      [owners > 50, 'Лимит ООО — 50 участников.'],
      [needsShares, 'Вы выбрали выпуск акций. ООО не выпускает акции — для этого рассматривается АО.'],
      [capital < 10_000, 'На уставный капитал ООО нужно от 10 000 ₽.'],
    ],
    jsc: [[
      capital < minimumShareCapital,
      `На уставный капитал выбранного вида АО нужно от ${capitalFormatter.format(minimumShareCapital)} ₽.`,
    ], [publicOffering && answers.publicBoard === 'no', 'Для ПАО нужен коллегиальный орган управления из пяти и более человек.']],
  };

  const financingRatings = needsShares ? [0, 0, 1] : needsCoOwnership ? [0, 1, .7] : [1, 1, .45];
  const riskRatings = limitsPersonalRisk ? [0, 1, 1] : [1, 1, 1];
  const criteria = [
    ['Собственность и инвестиции', 25, financingRatings],
    ['Управление', 20, controlRatings[control]],
    ['Корпоративный учёт', 15, adminRatings[admin]],
    ['Вид деятельности', 15, activityRatings[activity]],
    ['Масштаб', 15, scaleRatings[scale]],
    ['Имущественный риск', 10, riskRatings],
  ];

  return ['ip', 'llc', 'jsc'].map((key, index) => {
    const points = criteria.map(([label, weight, ratings]) => ({
      label,
      delta: Math.round(weight * (2 * ratings[index] - 1) * 100) / 100,
    }));
    const isPublic = key === 'jsc' && publicOffering;
    const unanswered = [[isPublic && isUnconfirmed(answers.publicBoard),
      'Уточните, сможете ли сформировать коллегиальный орган управления ПАО из пяти и более человек.']];
    return candidate(isPublic ? 'pao' : key, points, limits[key], unanswered);
  });
}

const nonprofitRules = {
  ano: {
    goal: ['services', 60, 'Оказание услуг'],
    membership: ['no', 25, 'Работа без членства', 'АНО не имеет членства.'],
    finance: ['services', 15, 'Оплата услуг'],
  },
  fund: {
    goal: ['charity', 60, 'Общественно полезные цели'],
    membership: ['no', 25, 'Работа без членства', 'Фонд не имеет членства.'],
    finance: ['donations', 15, 'Пожертвования и гранты'],
  },
  association: {
    goal: ['interests', 60, 'Представление интересов'],
    membership: ['yes', 25, 'Постоянное членство', 'Ассоциация основана на членстве.'],
    finance: ['fees', 15, 'Членские взносы'],
  },
  publicorg: {
    goal: ['movement', 60, 'Общественная деятельность'],
    membership: ['yes', 25, 'Членское объединение', 'Общественная организация основана на членстве.'],
    finance: ['fees', 15, 'Членские взносы'],
  },
  movement: {
    goal: ['movement', 60, 'Общественная деятельность'],
    membership: ['no', 25, 'Без постоянного членства', 'Общественное движение не имеет членства.'],
    finance: ['donations', 15, 'Поддержка общественной деятельности'],
  },
  institution: {
    goal: ['services', 50, 'Некоммерческие услуги'],
    membership: ['no', 10, 'Работа без членства', 'Учреждение не имеет членства.'],
    finance: ['owner', 40, 'Финансирование собственника'],
  },
};

function nonprofitCandidates(answers) {
  const founders = Number(answers.owners);
  const impossibleMixedFounders = answers.founderType === 'mixed' && founders < 2;
  const possibleIndividuals = answers.founderType === 'legal' ? 0 : founders - Number(answers.founderType === 'mixed');
  return Object.entries(nonprofitRules).map(([key, { goal, membership, finance }]) => {
    const matchesGoal = answers.socialGoal === goal[0];
    const matchesMembership = (answers.membership === 'yes' ? 'yes' : 'no') === membership[0];
    const isPublicAssociation = key === 'publicorg' || key === 'movement';
    const mixedPublicFounders = isPublicAssociation && answers.founderType === 'mixed';
    const mixedFoundersRequirement = 'Среди учредителей нужны как минимум три гражданина, а все организации-учредители должны быть общественными объединениями.';
    const criteria = [
      [matchesGoal, goal[1], goal[2]],
      [matchesMembership, membership[1], membership[2]],
      [answers.fundingSource === finance[0], finance[1], finance[2]],
    ];
    return goalCandidate(key, criteria, [
      [impossibleMixedFounders, 'Для смешанного состава нужны как минимум один гражданин и одна организация.'],
      [!matchesMembership, membership[3]],
      [!matchesGoal, 'Назначение формы не соответствует выбранной основной цели.'],
      [answers.fundingSource === 'fees' && answers.membership !== 'yes', 'Вы выбрали членские взносы, но отказались от членства. Укажите другой источник средств или членскую форму.'],
      [key === 'institution' && founders !== 1, 'Учреждение создаёт один собственник. Соучредительство не допускается.'],
      [key === 'association' && founders < 2, 'Для ассоциации нужно не менее двух учредителей.'],
      [isPublicAssociation && possibleIndividuals < 3, 'Для общественного объединения нужно не менее трёх учредителей-физлиц.'],
      [mixedPublicFounders && possibleIndividuals >= 3 && answers.publicFoundersFit === 'no', mixedFoundersRequirement],
      [answers.distribution === 'yes', 'Вы хотите распределять прибыль. Вернитесь к цели обычного бизнеса.'],
    ], [
      [mixedPublicFounders && possibleIndividuals >= 3 && isUnconfirmed(answers.publicFoundersFit), mixedFoundersRequirement],
    ]);
  });
}

function sharedCandidates({ sharedGoal, membership, propertyRights, owners, consumerFoundersFit }) {
  const hasMembers = membership === 'yes';
  const managesProperty = sharedGoal === 'property';
  const multipleOwners = Number(owners) > 1;
  return [
    goalCandidate('property', [
      [managesProperty, 80, 'Управление общей недвижимостью'],
      [hasMembers, 20, 'Членская организация'],
    ], [
      [!hasMembers, 'ТСН является членской организацией.'],
      [!managesProperty, 'Вы выбрали общие потребности участников. Для ТСН нужна цель совместного управления недвижимостью.'],
      [!multipleOwners, 'Для товарищества нужны несколько собственников недвижимости.'],
      [propertyRights === 'no', 'Для выбранной модели нужны собственники недвижимости.'],
    ], [
      [managesProperty && isUnconfirmed(propertyRights), 'Подтвердите права участников на недвижимость.'],
    ]),
    goalCandidate('consumer', [
      [sharedGoal === 'needs', 80, 'Общие потребности участников'],
      [hasMembers, 20, 'Объединение на основе членства'],
    ], [
      [!hasMembers, 'Кооператив основан на членстве.'],
      [managesProperty, 'Для управления общей недвижимостью сначала уточните ТСН или специальный вид жилищного кооператива.'],
      [!multipleOwners, 'Кооператив объединяет нескольких участников.'],
      [consumerFoundersFit === 'no', 'Состав учредителей не соответствует требованиям выбранного вида кооператива.'],
    ], [
      [!managesProperty && multipleOwners && isUnconfirmed(consumerFoundersFit),
        'Уточните вид потребительского кооператива и разрешённое число и состав его учредителей.'],
    ]),
  ];
}

function farmCandidate(answers) {
  const multipleMembers = Number(answers.owners) > 1;
  const personalWork = answers.personalWork === 'yes';
  return goalCandidate('farm', specializedCriteria(answers, 'farm'), [
    [!multipleMembers, 'Эта модель КФХ учитывает совместное хозяйство. Для самостоятельной работы уточните регистрацию КФХ без юридического лица.'],
    [!personalWork, 'Для КФХ требуется личное участие членов.'],
    [answers.farmingActivity === 'no', 'Для КФХ нужна совместная хозяйственная деятельность в области сельского хозяйства.'],
    [answers.risk === 'no', 'Для членов КФХ предусмотрена субсидиарная ответственность.'],
    [theProjectRequiresShares(answers), 'В КФХ участники вносят имущественные вклады. Для выпуска акций нужна форма АО.'],
  ], [
    [isUnconfirmed(answers.farmingActivity), 'Уточните, включает ли проект деятельность в области сельского хозяйства.'],
  ]);
}

function cooperativeCandidate(answers) {
  const enoughMembers = Number(answers.owners) >= 5;
  return goalCandidate('coop', specializedCriteria(answers, 'coop'), [
    [!enoughMembers, 'Для производственного кооператива требуется не менее пяти членов.'],
    [answers.cooperativeWorkFit === 'no', 'Число членов без личного трудового участия не должно превышать 25% числа лично работающих членов.'],
    [answers.voting === 'capital', 'В производственном кооперативе у каждого члена один голос независимо от размера пая.'],
    [answers.risk === 'no', 'Члены кооператива несут субсидиарную ответственность в установленных пределах.'],
    [theProjectRequiresShares(answers), 'Производственный кооператив не выпускает акции.'],
  ], [
    [isUnconfirmed(answers.cooperativeWorkFit), 'Уточните число лично работающих членов кооператива.'],
  ]);
}

// Same criterion weights as companies: mandatory conditions do not grant an automatic 100.
// Coefficients describe preferences in this teaching model, not legal eligibility.
function specializedCriteria(answers, key) {
  const cooperative = key === 'coop';
  const financing = theProjectRequiresShares(answers) ? 0 : answers.funding === 'partners' ? .85 : .95;
  const control = { 0: 1, 1: .7, 2: .4 }[answers.control] ?? .5;
  const administration = { 0: .9, 1: 1, 2: .5 }[answers.admin] ?? .5;
  const activity = cooperative
    ? { production: 1, service: .9, trade: .65, special: .5 }[answers.activity] ?? .5
    : answers.farmingActivity === 'yes' ? 1 : 0;
  const scale = { small: 1, medium: .9, large: .65 }[answers.scale] ?? .5;
  const criteria = [
    ['Собственность и инвестиции', 25, financing],
    ['Управление', 20, control],
    ['Корпоративный учёт', 15, administration],
    ['Вид деятельности', 15, activity],
    ['Масштаб', 15, scale],
    ['Имущественный риск', 10, answers.risk === 'yes' ? 1 : 0],
  ];
  return criteria.map(([label, weight, fit]) => [true, Math.round(weight * (2 * fit - 1) * 100) / 100, label]);
}

function candidatesFor(answers) {
  switch (answers.purpose) {
    case 'social': return nonprofitCandidates(answers);
    case 'propertyGoal': return sharedCandidates(answers);
    case 'agriculture': return [...businessCandidates(answers), farmCandidate(answers)];
    case 'team': return [...businessCandidates(answers), cooperativeCandidate(answers)];
    default: return businessCandidates(answers);
  }
}

export function rank(answers) {
  if (answers.purpose === 'specialGoal') {
    const key = answers.specialType;
    if (!Object.hasOwn(specialProfiles, key)) return [];
    const assessment = assessSpecial(key, answers);
    const excluded = assessment.checks.filter(({ status }) => status === 'blocked').map(({ label }) => label);
    const pending = assessment.checks.filter(({ status }) => status === 'pending').map(({ label }) => label);
    return [{ key, score: 0, excluded, pending, reasons: [], top: [], special: true, assessment }];
  }

  return candidatesFor(answers).sort((left, right) =>
    Number(left.excluded.length > 0) - Number(right.excluded.length > 0) ||
    Number(left.pending.length > 0) - Number(right.pending.length > 0) ||
    right.score - left.score);
}

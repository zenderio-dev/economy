import {assessSpecial} from './special.mjs';
export const forms = {
  ip: ['ИП — индивидуальный предприниматель', 'Вы ведёте бизнес от своего имени. Подходит для самостоятельного старта. ИП отвечает по долгам своим имуществом с предусмотренными законом исключениями.'],
  llc: ['ООО — общество с ограниченной ответственностью', 'Бизнес ведёт отдельная компания. Владельцы могут поделить доли и обычно рискуют их стоимостью. У этого правила есть исключения.'],
  jsc: ['АО — акционерное общество', 'Участие оформляется акциями. Они помогают привлекать инвесторов, но требуют соблюдать правила выпуска и учёта.']
};
export function compare(a) {
  const owners=Number(a.owners);
  const shares=a.funding==='shares'||a.transfer==='2'||a.growth==='2';
  const multiple=owners>1||a.funding==='partners'||a.transfer==='1'||a.growth==='1';
  const limited=a.risk==='no';
  const capital=Number(a.capitalAmount);
  const needsPublic=a.market==='public';
  const usesShares=shares||needsPublic;
  const capitalJsc=needsPublic?100000:10000;
  const rules={
    ip:[[multiple,'Нужно юридически оформить совладение.'],[usesShares,'Нужны акции.'],[limited,'Указано требование ограничить личный имущественный риск.'],[a.control==='2','Указан совет директоров.']],
    llc:[[owners>50,'Лимит ООО — 50 участников.'],[usesShares,'В планах нужны акции.'],[capital<10000,'На уставный капитал ООО нужно от 10 000 ₽.']],
    jsc:[[capital<capitalJsc,'На уставный капитал выбранного вида АО нужно от '+capitalJsc.toLocaleString('ru-RU')+' ₽.']]
  };
  const investment=usesShares?[0,0,1]:multiple?[0,1,.7]:[1,1,.45];
  const management=a.control==='2'?[0,.75,1]:a.control==='1'?[.4,1,.9]:[1,.8,.45];
  const administration=a.admin==='0'?[1,.65,.25]:a.admin==='1'?[.8,1,.65]:[.65,.85,1];
  const operation=a.activity==='production'?[.55,1,.8]:a.activity==='special'?[.5,.5,.5]:[1,.9,.6];
  const scale=a.scale==='large'?[.35,.8,1]:a.scale==='medium'?[.6,1,.85]:[1,.9,.55];
  const risk=limited?[0,1,1]:[1,1,1];
  const factors=[
    [25,'Собственность и инвестиции',investment],[20,'Управление',management],
    [15,'Корпоративный учёт',administration],[15,'Вид деятельности',operation],
    [15,'Масштаб',scale],[10,'Имущественный риск',risk]
  ];
  return ['ip','llc','jsc'].map((key,index)=>{
    const contributions=factors.map(([weight,label,ratings])=>[weight*ratings[index],weight,label]);
    return {key,score:Math.round(contributions.reduce((sum,[points])=>sum+points,0)*10)/10,
      excluded:rules[key].filter(([blocked])=>blocked).map(([,reason])=>reason),
      reasons:contributions.map(([points,weight,label])=>label+' · '+Number(points.toFixed(2))+' / '+weight)};
  });
}

const catalog = {"coop":{"name":"Производственный кооператив","desc":"Совместное производство с личным трудовым участием членов.","review":false},"farm":{"name":"Крестьянское (фермерское) хозяйство — юридическое лицо","desc":"Для совместного сельскохозяйственного дела. Проверьте состав участников, порядок создания и ответственность.","review":false},"full":{"name":"Полное товарищество","desc":"Для партнёров, готовых вести дела от имени товарищества и отвечать по его обязательствам своим имуществом.","review":false},"limited":{"name":"Товарищество на вере","desc":"Полные товарищи управляют и несут полную ответственность, вкладчики участвуют капиталом.","review":false},"partnership":{"name":"Хозяйственное партнёрство","desc":"Управление и права участников определяются соглашением. Проверьте специальный закон и ограничения.","review":false},"unitary":{"name":"Государственное или муниципальное унитарное предприятие","desc":"Создание относится к компетенции публичного собственника и требует законного основания.","review":true},"ano":{"name":"Автономная некоммерческая организация","desc":"Организация услуг без распределения прибыли между учредителями.","review":false},"fund":{"name":"Общественно полезный фонд","desc":"Для общественно полезных целей и имущественных взносов без членства.","review":false},"personal":{"name":"Личный фонд","desc":"Для управления переданным имуществом. Применяются специальные требования к учреждению и имуществу.","review":true},"association":{"name":"Ассоциация или союз","desc":"Членская организация для защиты и представления общих интересов.","review":false},"publicorg":{"name":"Общественная организация","desc":"Членское объединение граждан по общим интересам.","review":false},"movement":{"name":"Общественное движение","desc":"Общественное объединение без членства.","review":false},"consumer":{"name":"Потребительский кооператив","desc":"Объединение для удовлетворения потребностей участников на основе паевых взносов.","review":false},"property":{"name":"Товарищество собственников недвижимости","desc":"Объединение собственников для совместного управления имуществом.","review":false},"institution":{"name":"Учреждение","desc":"Для некоммерческих функций по решению собственника, включая частные, государственные и муниципальные учреждения.","review":false},"cossack":{"name":"Казачье общество","desc":"Применяются специальные требования и государственный реестр.","review":true},"community":{"name":"Община коренных малочисленных народов","desc":"Применяются специальные требования к составу и деятельности.","review":true},"religious":{"name":"Религиозная организация","desc":"Применяются специальные требования к учреждению и регистрации.","review":true},"ppc":{"name":"Публично-правовая компания","desc":"Создание и деятельность регулируются специальными нормами.","review":true},"lawchamber":{"name":"Адвокатская палата","desc":"Специальная форма адвокатского самоуправления.","review":true},"laworg":{"name":"Адвокатское образование — юридическое лицо","desc":"Применяются специальные правила адвокатской деятельности.","review":true},"statecorp":{"name":"Государственная корпорация","desc":"Учреждается Российской Федерацией на основании федерального закона.","review":true},"notary":{"name":"Нотариальная палата","desc":"Специальная форма профессионального нотариального самоуправления.","review":true}};
for (const [key, entry] of Object.entries(catalog)) forms[key]=[entry.name,entry.desc];
forms.pao=['ПАО — публичное акционерное общество','Для работы с публичным рынком акций. Публичный статус требует выполнения специальных условий.'];

function signedRows(rows) {
  return rows.map(row=>{
    const points=row.reasons.map(reason=>{
      const [label,amount]=reason.split(' · ');
      const [score,weight]=amount.split(' / ').map(Number);
      return {label,delta:Math.round((2*score-weight)*100)/100};
    });
    return {...row,score:Math.round(points.reduce((sum,p)=>sum+p.delta,0)*10)/10,
      reasons:points.map(p=>(p.delta>0?'+':'')+p.delta+' · '+p.label),
      top:points.filter(p=>p.delta>0).sort((a,b)=>b.delta-a.delta).slice(0,2).map(p=>p.label)};
  });
}

export const goalFields = {"business":[],"agriculture":["personalWork"],"team":["personalWork","voting"],"social":["socialGoal","membership","fundingSource","distribution","founderType"],"propertyGoal":["sharedGoal","membership","propertyRights"],"specialGoal":["specialType"]};

function candidate(key, rules, exclusions=[]) {
  const points=rules.filter(([condition])=>condition).map(([,delta,label])=>({delta,label}));
  return {key,score:points.reduce((sum,p)=>sum+p.delta,0),excluded:exclusions,
    reasons:points.map(p=>(p.delta>0?'+':'')+p.delta+' · '+p.label),
    top:points.filter(p=>p.delta>0).sort((a,b)=>b.delta-a.delta).slice(0,2).map(p=>p.label)};
}
function rankCore(a) {
  const ordinary=()=>signedRows(compare(a));
  let rows;
  if (a.purpose==='social') {
    const member=a.membership==='yes';
    rows=[
      candidate('ano',[[a.socialGoal==='services',60,'Оказание услуг'],[!member,25,'Работа без членства'],[a.fundingSource==='services',15,'Оплата услуг']],member?['АНО не имеет членства.']:[]),
      candidate('fund',[[a.socialGoal==='charity',60,'Общественно полезные цели'],[!member,25,'Работа без членства'],[a.fundingSource==='donations',15,'Пожертвования и гранты']],member?['Фонд не имеет членства.']:[]),
      candidate('association',[[a.socialGoal==='interests',60,'Представление интересов'],[member,25,'Постоянное членство'],[a.fundingSource==='fees',15,'Членские взносы']],!member?['Ассоциация основана на членстве.']:[]),
      candidate('publicorg',[[a.socialGoal==='movement',60,'Общественная деятельность'],[member,25,'Членское объединение'],[a.fundingSource==='fees',15,'Членские взносы']],!member?['Общественная организация основана на членстве.']:[]),
      candidate('movement',[[a.socialGoal==='movement',60,'Общественная деятельность'],[!member,25,'Без постоянного членства'],[a.fundingSource==='donations',15,'Поддержка общественной деятельности']],member?['Общественное движение не имеет членства.']:[]),
      candidate('institution',[[a.socialGoal==='services',50,'Некоммерческие услуги'],[a.fundingSource==='owner',40,'Финансирование собственника'],[!member,10,'Работа без членства']],member?['Учреждение не имеет членства.']:[])
    ];
  } else if(a.purpose==='propertyGoal') {
    rows=[
      candidate('property',[[a.sharedGoal==='property',80,'Управление общей недвижимостью'],[a.membership==='yes',20,'Членская организация']],a.membership!=='yes'?['ТСН является членской организацией.']:[]),
      candidate('consumer',[[a.sharedGoal==='needs',80,'Общие потребности участников'],[a.membership==='yes',20,'Объединение на основе членства']],a.membership!=='yes'?['Кооператив основан на членстве.']:[])
    ];
  } else if(a.purpose==='specialGoal') {
    const key=a.specialType;
    if(!catalog[key]) return [];
    const assessment=assessSpecial(key,a);
    return [{key,score:0,excluded:assessment.checks.filter(c=>c.status!=='confirmed').map(c=>c.label),
      reasons:[],top:[],special:true,assessment}];
  } else {
    rows=ordinary();
    if(a.purpose==='agriculture') {
      const limits=[];
      if(+a.owners<2) limits.push('Для выбранного сценария КФХ как юридического лица требуется совместное ведение хозяйства. Рассмотрите ИП и уточните вариант регистрации хозяйства.');
      if(a.personalWork!=='yes') limits.push('Для КФХ требуется личное участие членов.');
      if(a.risk==='no') limits.push('Для членов КФХ предусмотрена субсидиарная ответственность.');
      rows.push(candidate('farm',[[true,60,'Сельскохозяйственная деятельность'],[a.personalWork==='yes',30,'Личное участие'],[+a.owners>1,10,'Совместное хозяйство']],limits));
    }
    if(a.purpose==='team') {
      const limits=[];
      if(+a.owners<5) limits.push('Для производственного кооператива требуется не менее пяти членов.');
      if(a.personalWork!=='yes') limits.push('Нужно уточнить соблюдение требований к трудовому участию.');
      if(a.risk==='no') limits.push('Члены кооператива несут субсидиарную ответственность в установленных пределах.');
      rows.push(candidate('coop',[[a.personalWork==='yes',50,'Совместный личный труд'],[a.voting==='equal',40,'Один член — один голос'],[+a.owners>=5,10,'Достаточное число участников'],[a.voting==='capital',-40,'Предпочтение голосования по долям']],limits));
    }
    for(const row of rows) if(row.key==='jsc'&&a.market==='public') row.key='pao';
  }
  return rows.sort((a,b)=>Number(!!a.excluded.length)-Number(!!b.excluded.length)||b.score-a.score);
}

export function rank(a) {
  const rows=rankCore(a);
  for(const row of rows) {
    const n=Number(a.owners);
    const purposes={ano:'services',institution:'services',fund:'charity',association:'interests',publicorg:'movement',movement:'movement'};
    if(a.purpose==='social' && purposes[row.key]!==a.socialGoal) row.excluded.push('Назначение формы не соответствует выбранной основной цели.');

    if(row.key==='institution' && n!==1) row.excluded.push('Учреждение создаёт один собственник. Соучредительство не допускается.');
    if(row.key==='association' && n<2) row.excluded.push('Для ассоциации нужно не менее двух учредителей.');
    if(['publicorg','movement'].includes(row.key) && n<3) row.excluded.push('Для общественного объединения требуется не менее трёх учредителей.');
    if(a.purpose==='social' && a.distribution==='yes') row.excluded.push('Вы хотите распределять прибыль. Вернитесь к цели обычного бизнеса.');
    if(row.key==='property' && a.sharedGoal!=='property') row.excluded.push('Вы выбрали общие потребности, а не управление недвижимостью.');
    if(row.key==='property' && a.propertyRights==='no') row.excluded.push('Для выбранной модели нужны собственники недвижимости.');
    if(row.key==='consumer' && a.sharedGoal==='property') row.excluded.push('Для управления общей недвижимостью сначала уточните ТСН или специальный вид жилищного кооператива.');
    if(['publicorg','movement'].includes(row.key) && a.founderType==='legal') row.excluded.push('Учредителями общественного объединения должны быть также граждане. Проверьте требования № 82-ФЗ.');
  }
  return rows.sort((a,b)=>Number(!!a.excluded.length)-Number(!!b.excluded.length)||b.score-a.score);
}

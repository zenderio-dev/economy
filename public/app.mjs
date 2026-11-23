import {guidance} from './guidance.mjs';
import {specialProfiles} from './special.mjs';
import {rank,forms,goalFields} from './selection.mjs';
import {calculate,buildExample} from './economics.mjs';

let selected = null;
const exampleSection = document.querySelector('#finance');
const economy = document.querySelector('#economy');
const currency = new Intl.NumberFormat('ru-RU');
const rub = value => currency.format(value) + ' ₽';

function showExample(answers, ranking) {
  const {activity,scale,plan,profiles} = buildExample(answers);
  const selected = new Map(ranking.map(row=>[row.key,row]));
  const rows = profiles.flatMap(profile=>{
    const key = profile.key==='jsc' && selected.has('pao') ? 'pao' : profile.key;
    const row = selected.get(key);
    if (!row || row.excluded.length) return [];
    return [{...calculate(plan,profile),profile,name:key==='pao'?'ПАО':profile.name}];
  });
  exampleSection.hidden = rows.length===0;
  if (!rows.length) return;
  document.querySelector('#example-inputs').textContent =
    'Пример: '+activity+', масштаб — '+scale.name+'. За месяц: '+currency.format(plan.units)+
    ' продаж по '+rub(plan.price)+'. Расходы на продажу — '+rub(plan.variable)+
    ', постоянные расходы — '+rub(plan.fixed)+'.';
  const metrics = [
    ['Выручка',row=>row.revenue],
    ['Общие расходы бизнеса',()=>plan.fixed+plan.units*plan.variable],
    ['Учёт и управление',row=>row.profile.admin],
    ['Условные взносы',row=>row.profile.contributions],
    ['Условный налог',row=>row.tax],
    ['Остаётся за месяц',row=>row.net]
  ];
  const headers=rows.map(row=>'<th scope="col">'+row.name+'</th>').join('');
  const body=metrics.map(([label,read])=>'<tr><th scope="row">'+label+'</th>'+rows.map(row=>'<td>'+rub(read(row))+'</td>').join('')+'</tr>').join('');
  economy.innerHTML='<div class="table-wrap"><table><thead><tr><th scope="col">За месяц</th>'+headers+'</tr></thead><tbody>'+body+'</tbody></table></div>';
  const ordered=[...rows].sort((a,b)=>b.net-a.net);
  const [first,second]=ordered;
  document.querySelector('#example-summary').textContent=second
    ? first.net===second.net?'У двух лучших сценариев одинаковый результат: '+rub(first.net)+'.'
      :'В этом примере у '+first.name+' остаётся на '+rub(first.net-second.net)+' больше, чем у '+second.name+'. Выручка при одинаковых продажах совпадает.'
    :'По вашим условиям в этом примере можно показать только '+first.name+'.';
  const tradeoff=document.createElement('p');tradeoff.textContent='Подбор формы учитывает владение, управление и риск. Финансовые суммы в примере условные: их разница сама по себе не определяет выбор формы.';economy.append(tradeoff);
}
const form=document.querySelector('#selection-form');
const result=document.querySelector('#selection');
form.addEventListener('input',()=>{
  result.hidden=true;
  selected=null;
  exampleSection.hidden=true;

});
const specialBox=document.querySelector('#special-questions');
function renderSpecialQuestions() {
  specialBox.replaceChildren();
  specialBox.hidden=form.elements.purpose.value!=='specialGoal';
  if(specialBox.hidden) return;
  const profile=specialProfiles[form.elements.specialType.value];
  if(!profile) return;
  const intro=document.createElement('p');intro.textContent=profile.intro;specialBox.append(intro);
  for(const check of profile.checks) {
    const label=document.createElement('label');label.textContent=check.label;
    const select=document.createElement('select');select.name='special_'+check.id;select.required=true;
    for(const [value,title] of [['','Выберите ответ'],...check.options]) {
      const option=document.createElement('option');option.value=value;option.textContent=title;select.append(option);
    }
    const small=document.createElement('small');small.textContent=check.help;
    label.append(select,small);specialBox.append(label);
  }
  if(profile.count) {
    const label=document.createElement('label');label.textContent='Сколько будет участников?';
    const input=document.createElement('input');
    input.type='number';input.name='special_count';input.min='1';input.max='100000';input.step='1';input.required=true;
    label.append(input);specialBox.append(label);
  }
}
function renderSpecialResult(assessment) {
  const titles={blocked:'Есть препятствия в указанных условиях',pending:'Нужно уточнить сведения',preliminary:'Базовые условия предварительно выполнены'};
  const box=document.querySelector('#special-result');box.replaceChildren();
  const heading=document.createElement('h3');heading.textContent=titles[assessment.status];box.append(heading);
  const labels={confirmed:'Указано «да»',blocked:'Препятствие',pending:'Нужно уточнить'};
  const list=document.createElement('ul');
  for(const check of assessment.checks) {
    const item=document.createElement('li');item.textContent=labels[check.status]+' — '+check.label+' '+check.help;list.append(item);
  }
  box.append(list);
  const money=document.createElement('p');money.textContent=assessment.economic;box.append(money);
  const title=document.createElement('h3');title.textContent='Что делать дальше';box.append(title);
  const steps=document.createElement('ol');
  for(const text of assessment.steps){const item=document.createElement('li');item.textContent=text;steps.append(item);}
  box.append(steps);
  const link=document.createElement('a');link.href=assessment.source[1];link.textContent=assessment.source[0];box.append(link);
  const note=document.createElement('p');note.textContent='Ответы ещё нужно подтвердить документами. Возможность регистрации и специальные ограничения проверяются отдельно.';box.append(note);
}


function renderGuidance(key) {
  const box=document.querySelector('#regular-guide');
  box.replaceChildren();
  const info=guidance[key];box.hidden=!info;
  if(!info) return;
  const title=document.createElement('h3');title.textContent='Что это значит для проекта';
  const economics=document.createElement('p');economics.textContent=info.economics;
  const list=document.createElement('ol');
  for(const step of info.steps){const li=document.createElement('li');li.textContent=step;list.append(li);}
  const link=document.createElement('a');link.href=info.source[1];link.textContent=info.source[0];
  const note=document.createElement('p');note.textContent='Предварительный подбор по базовым условиям. Перед регистрацией проверьте документы, отраслевые ограничения и налоги.';
  box.append(title,economics,list,link,note);
}

function showRelevantFields() {
  const goal=form.elements.purpose.value;
  const commercial=['business','agriculture','team'].includes(goal);
  const common=['purpose'];
  if(goal!=='specialGoal') common.push('owners');
  if(commercial) common.push('risk');
  const allSpecific=Object.values(goalFields).flat();
  for(const field of form.querySelectorAll('select,input')) {
    if(specialBox.contains(field)) continue;
    const visible=common.includes(field.name) || goalFields[goal].includes(field.name) ||
      (commercial && !allSpecific.includes(field.name) && field.name!=='purpose');
    const applicable=visible && (field.name!=='propertyRights'||form.elements.sharedGoal.value==='property');
    field.disabled=!applicable;
    field.closest('label').hidden=!applicable;
  }
}
form.elements.purpose.addEventListener('change',()=>{showRelevantFields();renderSpecialQuestions();});
form.elements.specialType.addEventListener('change',renderSpecialQuestions);
form.elements.sharedGoal.addEventListener('change',showRelevantFields);
showRelevantFields();
renderSpecialQuestions();
form.addEventListener('submit', event=>{
  event.preventDefault();
  const answers=Object.fromEntries(new FormData(form));
  document.querySelector('#special-result').hidden=true;
  document.querySelector('#regular-guide').hidden=true;
  document.querySelector('#comparison').hidden=false;
  selected=rank(answers);
  if(!selected.length) return;
  if(selected[0].assessment) {
    const row=selected[0];
    result.querySelector('h2').textContent=forms[row.key][0];
    result.querySelector('#reason').textContent='Проверка условий создания по вашим ответам';
    result.querySelector('#benefits').textContent=forms[row.key][1];
    result.querySelector('small').textContent='';
    document.querySelector('#comparison').hidden=true;
    const box=document.querySelector('#special-result');box.hidden=false;
    renderSpecialResult(row.assessment);
    exampleSection.hidden=true;
    result.hidden=false;
    result.scrollIntoView({block:'nearest'});
    return;
  }
  const best=selected.find(row=>!row.excluded.length);
  const focus=best||selected[0];
  const name=forms[focus.key][0];
  result.querySelector('h2').textContent=best ? 'Рекомендация: '+name : focus.special ? 'Проверьте условия создания: '+name : 'Подходящей формы при этих условиях нет';
  if(best) renderGuidance(best.key);
  const tied=best&&selected.some(row=>row!==best&&!row.excluded.length&&row.score===best.score);
  result.querySelector('#reason').textContent=best&&!best.special
    ? 'Итог: '+(best.score>0?'+':'')+best.score+' баллов. '+(best.top.length?'Главные плюсы: '+best.top.join(', ')+'. ':'')+(tied?'При равенстве приоритет отдаётся более простой форме.':'')
    : focus.special?'Подбор по специальной цели проекта.':'Откройте разбор: измените цель или условия, с которыми вы готовы работать. Баллы не отменяют ограничения.';
  result.querySelector('#benefits').textContent=best||focus.special?forms[focus.key][1]:'';
  result.querySelector('small').textContent=[answers.activity==='special'?'Уточните требования к деятельности и лицензированию.':'',answers.propertyRights==='unknown'?'Для ТСН требуется подтвердить права участников на недвижимость.':''].filter(Boolean).join(' ');
  const details=document.querySelector('#comparison');
  details.open=!best;
  const body=details.querySelector('div');
  body.replaceChildren(...selected.map(row=>{
    const section=document.createElement('article');
    const title=document.createElement('h3');
    title.textContent=forms[row.key][0]+' · '+(row.excluded.length?'проверить ограничения':row.special?'подходит по цели':(row.score>0?'+':'')+row.score+' баллов');
    const list=document.createElement('ul');
    for(const reason of [...row.excluded,...row.reasons]){
      const item=document.createElement('li');item.textContent=reason;list.append(item);
    }
    section.append(title,list);
    return section;
  }));
  result.hidden=false;
  exampleSection.hidden=true;
  if(['business','agriculture','team'].includes(answers.purpose)) showExample(answers,selected);

  result.scrollIntoView({block:'nearest'});
});

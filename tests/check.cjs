const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..', 'public');
const read = name => fs.readFileSync(path.join(root,name),'utf8');
const special = new Function(read('special.mjs').replaceAll('export ', '')+';return {specialProfiles,assessSpecial}')();
const api = new Function('assessSpecial',read('selection.mjs').replace(/^import .*$/gm,'').replaceAll('export ','')+';return {rank,forms,goalFields}')(special.assessSpecial);
let cases = 0;
for (const [key, profile] of Object.entries(special.specialProfiles)) {
  const yes = Object.fromEntries(profile.checks.map(c=>['special_'+c.id,'yes']));
  if(profile.count) yes.special_count=String(profile.count[0]);
  assert.equal(special.assessSpecial(key,yes).status,'preliminary',key);
  assert.equal(special.assessSpecial(key,{}).status,'pending',key);
  for(const check of profile.checks) {
    assert.equal(special.assessSpecial(key,{...yes,['special_'+check.id]:'no'}).status,'blocked',key+check.id);
    assert.equal(special.assessSpecial(key,{...yes,['special_'+check.id]:'unknown'}).status,'pending',key+check.id);
    cases += 2;
  }
  if(profile.count) assert.equal(special.assessSpecial(key,{...yes,special_count:'1'}).status,'blocked',key);
  const result=api.rank({purpose:'specialGoal',specialType:key,...yes})[0];
  assert.equal(result.assessment.status,'preliminary');
  assert.ok(result.assessment.steps.length>=3);
  assert.ok(result.assessment.source[1].startsWith('https://'));
  cases+=3;
}
const base={owners:'5',risk:'yes',personalWork:'yes',voting:'equal',activity:'production',scale:'small',control:'0',admin:'0',capitalAmount:'10000',market:'private',growth:'0',transfer:'0',funding:'none'};
const rank = changes => api.rank({...base,...changes});
assert.equal(rank({purpose:'team'})[0].key,'coop');
assert.equal(rank({purpose:'agriculture'})[0].key,'farm');
assert.equal(rank({purpose:'social',socialGoal:'services',membership:'no',fundingSource:'services'})[0].key,'ano');
assert.equal(rank({purpose:'social',socialGoal:'charity',membership:'no',fundingSource:'donations'})[0].key,'fund');
assert.equal(rank({purpose:'propertyGoal',sharedGoal:'property',membership:'yes'})[0].key,'property');
assert.equal(rank({purpose:'business',owners:'1',activity:'trade'})[0].key,'ip');
new Function(read('app.mjs').replace(/^import .*$/gm,''));
assert.ok(read('index.html').includes('id="special-questions"'));
assert.ok(read('index.html').includes('id="special-result"'));
assert.ok(read('app.mjs').includes('if(specialBox.contains(field)) continue;'));
assert.ok(read('app.mjs').includes("specialType.addEventListener('change',renderSpecialQuestions)"));
const economics = new Function(read('economics.mjs').replaceAll('export ','')+';return {calculate,buildExample}')();
const example = economics.buildExample(base);
assert.equal(economics.calculate(example.plan,example.profiles[0]).net,17300);
console.log(cases+' special-condition cases, 6 goal branches, financial calculation and client syntax passed');

class Element {
  constructor(tag='div') {this.tagName=tag;this.children=[];this.hidden=false;this.events={};this.value='';}
  append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}
  replaceChildren(...nodes){this.children=[];this.append(...nodes);}
  addEventListener(type,fn){(this.events[type]??=[]).push(fn);}
  contains(node){return this.children.some(child=>child===node||child.contains?.(node));}
  closest(){return this.parent;}
  scrollIntoView(){}
  querySelector(key){return (this.parts??={})[key]??=((key==='div')?new Element():new Element());}
}
const html=read('index.html');
const form=new Element('form');
const controls={};
for(const m of html.slice(html.indexOf('<form'),html.indexOf('</form>')).matchAll(/<(select|input)\b([^>]*)>/g)){
 const name=m[2].match(/name="([^"]+)"/)?.[1];if(!name)continue;
 const el=new Element(m[1]);el.name=name;el.value=m[2].match(/value="([^"]*)"/)?.[1]||'';
 const label=new Element('label');label.append(el);form.append(label);controls[name]=el;
}
controls.purpose.value='business';
const specialBox=new Element('fieldset');form.append(specialBox);
const allFields=()=>[...Object.values(controls),...specialBox.children.flatMap(label=>label.children.filter(n=>['input','select'].includes(n.tagName)))];
form.querySelectorAll=()=>allFields();
form.elements=controls;
const surfaces={'#selection-form':form,'#special-questions':specialBox};
const document={querySelector:key=>surfaces[key]??=(new Element()),createElement:tag=>new Element(tag)};
function FormDataMock(){return allFields().filter(el=>!el.disabled).map(el=>[el.name,el.value]);}
const guidance = new Function(read('guidance.mjs').replace('export ','')+';return guidance')();
const appSource=read('app.mjs').replace(/^import .*$/gm,'');
new Function('document','FormData','rank','forms','goalFields','calculate','buildExample','specialProfiles','guidance',appSource)(
 document,FormDataMock,api.rank,api.forms,api.goalFields,economics.calculate,economics.buildExample,special.specialProfiles,guidance);
for(const [key,profile] of Object.entries(special.specialProfiles)){
 controls.purpose.value='specialGoal';
 controls.specialType.value=key;
 for(const fn of controls.purpose.events.change)fn();
 assert.equal(specialBox.hidden,false);
 const dynamic=allFields().filter(el=>el.name?.startsWith('special_'));
 assert.equal(dynamic.length,profile.checks.length+(profile.count?1:0),key);
 for(const field of dynamic)field.value=field.name==='special_count'?String(profile.count[0]):'yes';
 for(const fn of form.events.submit)fn({preventDefault(){}});
 assert.equal(surfaces['#selection'].hidden,false);
 assert.equal(surfaces['#special-result'].hidden,false);
 assert.equal(surfaces['#finance'].hidden,true);
}
controls.purpose.value='business';
for(const fn of controls.purpose.events.change)fn();
assert.equal(specialBox.hidden,true);
assert.equal(specialBox.children.length,0);
assert.equal(controls.activity.disabled,false);
console.log('13 special form submission paths and switching back to business passed');





for (const key of ['ip','llc','jsc','pao','coop','farm','ano','fund','association','publicorg','movement','institution','property','consumer']) {
  assert.ok(guidance[key]?.steps.length>=3,key);
  assert.ok(guidance[key].source[1].startsWith('https://'),key);
}
assert.ok(rank({purpose:'social',socialGoal:'interests',membership:'yes',fundingSource:'fees',owners:'1'}).find(r=>r.key==='association').excluded.length);
assert.ok(rank({purpose:'social',socialGoal:'services',membership:'no',fundingSource:'owner',owners:'2'}).find(r=>r.key==='institution').excluded.length);
assert.ok(rank({purpose:'social',socialGoal:'movement',membership:'yes',fundingSource:'fees',owners:'2'}).find(r=>r.key==='publicorg').excluded.length);
assert.ok(rank({purpose:'social',socialGoal:'services',membership:'no',fundingSource:'services',distribution:'yes'}).every(r=>r.excluded.length));
let combinations=0;
const matching={services:['ano','institution'],charity:['fund'],interests:['association'],movement:['publicorg','movement']};
for(const socialGoal of Object.keys(matching))for(const membership of ['yes','no'])for(const fundingSource of ['fees','services','donations','owner'])for(const owners of ['1','2','3','5'])for(const distribution of ['yes','no']) {
  const rows=rank({purpose:'social',socialGoal,membership,fundingSource,owners,distribution});
  for(const row of rows.filter(r=>!r.excluded.length)) assert.ok(matching[socialGoal].includes(row.key),JSON.stringify({socialGoal,row}));
  combinations++;
}
assert.ok(rank({purpose:'propertyGoal',sharedGoal:'property',membership:'yes',propertyRights:'no'}).every(r=>r.excluded.length));
console.log(combinations+' nonprofit combinations and 14 guidance cards checked');

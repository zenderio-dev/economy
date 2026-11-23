export function calculate(plan, profile) {
  const fullFixed = plan.fixed + profile.admin + profile.contributions;
  const startup = plan.initial + profile.setup + plan.working;
  const taxRate = profile.rate / 100;
  const netContribution = plan.price - plan.variable - (profile.base === 'revenue' ? plan.price * taxRate : 0);
  const breakEven = netContribution > 0 ? Math.ceil(fullFixed / netContribution - 1e-9) : null;
  function at(volume) {
    const revenue = plan.price * volume;
    const operatingCost = plan.variable * volume + fullFixed;
    const beforeTax = revenue - operatingCost;
    const tax = taxRate * (profile.base === 'revenue' ? revenue : Math.max(0, beforeTax));
    const net = beforeTax - tax;
    return {volume,revenue,operatingCost,beforeTax,tax,net};
  }
  const base = at(plan.units);
  return {...base,startup,breakEven,netContribution,
    margin:base.revenue ? base.net/base.revenue*100 : null,
    utilization:plan.capacity ? plan.units/plan.capacity*100 : null,
    payback:base.net > 0 && startup > 0 ? startup/base.net : null,
    firstYear:base.net*12-startup,
    scenarios:[at(Math.floor(plan.units*.8)),base,at(Math.ceil(plan.units*1.2))]};
}

// Illustrative assumptions for a monthly sales plan.
export function buildExample(answers) {
  const activities = {
    service: {name:'студия услуг', price:2500, units:45, variable:450, fixed:42000},
    trade: {name:'магазин товаров', price:1800, units:120, variable:1050, fixed:54000},
    production: {name:'мастерская', price:1500, units:80, variable:550, fixed:45000},
    special: {name:'условный проект', price:2000, units:60, variable:700, fixed:48000}
  };
  const scales = {
    small: {name:'малый', volume:1, expenses:1},
    medium: {name:'средний', volume:4, expenses:3},
    large: {name:'крупный', volume:12, expenses:8}
  };
  const {name:activity, ...base} = activities[answers.activity];
  const scale = scales[answers.scale];
  const plan = {...base, units:base.units*scale.volume, fixed:base.fixed*scale.expenses, initial:0, working:0, capacity:0};
  const management = ({
    '0': [0,0,0],
    '1': [25000,25000,35000],
    '2': [0,40000,60000]
  })[answers.control];
  const profiles = [
    ['ip','ИП',1500,5000], ['llc','ООО',5000,0], ['jsc','АО',15000,0]
  ].map(([key,name,admin,contributions],index)=>({
    key,name,admin:admin*scale.expenses+management[index],
    contributions,setup:0,rate:6,base:'revenue'
  }));
  return {activity,scale,plan,profiles};
}

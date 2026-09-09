export const DEFINITIONS = [
  {key:'capex',name:'CAPEX',ko:'자본적 지출',field:'capital_expenditures',history:'capital_expenditures_unchanged_fq_h',tone:'#ffba49'},
  {key:'fcf',name:'Free Cash Flow',ko:'잉여현금흐름',field:'free_cash_flow',history:'free_cash_flow_fq_h',tone:'#43d8ad'},
  {key:'eps',name:'EPS',ko:'희석 주당순이익',field:'earnings_per_share_diluted',history:'earnings_per_share_diluted_fq_h',tone:'#ce9dff'},
  {key:'revenue',name:'매출액',ko:'Revenue',field:'total_revenue',history:'total_revenue_fq_h',tone:'#55c5ff'},
  {key:'operatingIncome',name:'영업이익',ko:'Operating Income',field:'oper_income',history:null,tone:'#ff859b'},
];
export const COLUMNS = ['name','description','exchange','type','sector','fundamental_currency_code','fiscal_period_end_fq','last_report_frequency','earnings_release_date',
  ...DEFINITIONS.flatMap(d=>[d.field+'_fq',...(d.history?[d.history]:[])])];
export const finite = value => typeof value === 'number' && Number.isFinite(value);
export const fileKey = symbol => {
  if (!/^[A-Z0-9_]+:[A-Z0-9._-]+$/i.test(symbol)) throw new Error('Invalid symbol');
  return symbol.replace(':','_');
};
export function normalizeTradingView(row, fetchedAt = new Date().toISOString(), previous = null) {
  const raw=Object.fromEntries(COLUMNS.map((name,i)=>[name,row.d[i]]));
  const quarterly=raw.last_report_frequency===4;
  const periodEnd=finite(raw.fiscal_period_end_fq)?new Date(raw.fiscal_period_end_fq*1000).toISOString().slice(0,10):null;
  const metrics={};
  for(const def of DEFINITIONS){
    const value=raw[def.field+'_fq'];
    const current=finite(value)?(def.key==='capex'?Math.abs(value):value):null;
    let history=quarterly&&def.history&&Array.isArray(raw[def.history])?raw[def.history].slice(0,20).map(v=>finite(v)?v:null):[];
    // Only attach a history to a latest value when both agree. Missing quarters
    // remain null slots so QoQ / YoY cannot silently skip a reporting period.
    if(history.length && (!finite(current)||!finite(history[0])||Math.abs(history[0]-current)>Math.max(0.005,Math.abs(current)*0.0001)))history=[];
    if(!history.length)history=[current];
    metrics[def.key]={current,history};
  }
  const opObservations={...(previous?.operatingIncomeObservations||{})};
  if(periodEnd&&finite(metrics.operatingIncome.current))opObservations[periodEnd]=metrics.operatingIncome.current;
  const opHistory=metrics.operatingIncome.history;
  if(periodEnd&&quarterly){
    const currentMonth=Number(periodEnd.slice(0,4))*12+Number(periodEnd.slice(5,7))-1;
    for(const [end,value]of Object.entries(opObservations)){
      const gap=currentMonth-(Number(end.slice(0,4))*12+Number(end.slice(5,7))-1);
      if(gap>=0&&gap%3===0&&gap<=57){while(opHistory.length<=gap/3)opHistory.push(null);opHistory[gap/3]=value;}
    }
  }
  return {schemaVersion:1,symbol:row.s,ticker:raw.name,name:raw.description,exchange:raw.exchange,sector:raw.sector,
    currency:raw.fundamental_currency_code||null,periodEnd,quarterly,
    releaseDate:finite(raw.earnings_release_date)?new Date(raw.earnings_release_date*1000).toISOString().slice(0,10):null,
    fetchedAt,source:'TradingView',metrics,operatingIncomeObservations:opObservations};
}
export function compare(current,previous){
  if(!finite(current)||!finite(previous))return {text:'과거 데이터 없음',tone:'muted',percent:null,delta:null};
  const delta=current-previous;
  if(previous===0)return {text:current===0?'변동 없음':'비교 기준 0',tone:'muted',percent:null,delta};
  if(previous<0&&current>=0)return {text:current>0?'흑자 전환':'손익분기',tone:'up',percent:null,delta};
  if(previous>0&&current<0)return {text:'적자 전환',tone:'down',percent:null,delta};
  if(previous<0)return {text:delta>0?'적자 축소':delta<0?'적자 확대':'변동 없음',tone:delta>0?'up':delta<0?'down':'muted',percent:null,delta};
  const percent=delta/previous*100;
  return {text:(percent>0?'+':'')+percent.toFixed(2)+'%',tone:percent>0?'up':percent<0?'down':'muted',percent,delta};
}
export function periodLabel(offset){return offset===0?'최근 분기':offset===4?'4분기 전 · 전년 동기':offset+'분기 전';}

import {COLUMNS,DEFINITIONS,finite,fileKey,normalizeTradingView,compare,periodLabel} from './company-financials-model.mjs';

const root=document.getElementById('companyDashboard');
const state={companies:[],company:null,symbol:null,metric:'revenue',offset:0,unit:1e9,initialized:false,chart:null,controller:null,sequence:0};
const aliases={애플:'AAPL',엔비디아:'NVDA',마이크로소프트:'MSFT',테슬라:'TSLA',아마존:'AMZN',구글:'GOOGL',알파벳:'GOOGL',메타:'META',페이스북:'META',팔란티어:'PLTR',브로드컴:'AVGO',코스트코:'COST',월마트:'WMT',넷플릭스:'NFLX',버크셔:'BRK.B',버크셔해서웨이:'BRK.B',제이피모건:'JPM',제이피모건체이스:'JPM',오라클:'ORCL',인텔:'INTC',에이엠디:'AMD',퀄컴:'QCOM',보잉:'BA',코카콜라:'KO',나이키:'NKE',스타벅스:'SBUX',유나이티드헬스:'UNH',일라이릴리:'LLY',엑슨모빌:'XOM',셰브론:'CVX',디즈니:'DIS',비자:'V',마스터카드:'MA',페이팔:'PYPL',어도비:'ADBE',골드만삭스:'GS',뱅크오브아메리카:'BAC',모건스탠리:'MS',티에스엠씨:'TSM',쿠팡:'CPNG',로빈후드:'HOOD',코인베이스:'COIN',스노우플레이크:'SNOW'};
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const el=id=>document.getElementById(id);
const tvLink=c=>'https://www.tradingview.com/symbols/'+encodeURIComponent(c.symbol.replace(':','-'))+'/financials-income-statement/';
const stamp=value=>value?new Date(value).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',hour12:false}):'확인 불가';
function amount(value,key,full=false){
  if(!finite(value))return '자료 없음';
  const currency=state.company?.currency||'통화 미확인';
  if(key==='eps')return value.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:full?4:2})+' '+currency+'/주';
  const scale=full?1:state.unit;
  return (value/scale).toLocaleString('en-US',{minimumFractionDigits:full?0:2,maximumFractionDigits:full?2:2})+(full?' '+currency:scale===1e9?' B':scale===1e6?' M':'');
}
async function getJson(url,options={},signal){
  const controller=new AbortController();
  const abort=()=>controller.abort();
  if(signal?.aborted)throw new DOMException('Aborted','AbortError');
  signal?.addEventListener('abort',abort,{once:true});
  const timer=setTimeout(abort,12000);
  try{const response=await fetch(url,{...options,signal:controller.signal});if(!response.ok)throw Error('HTTP '+response.status);return await response.json();}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
function shell(){
  root.innerHTML=`<div class="cf-shell">
    <div class="cf-top"><div><div class="cf-eyebrow">06 / COMPANY FINANCIALS</div><h1>미국 기업 재무 분석</h1><div id="cfUniverse" class="cf-meta"></div></div><div id="cfStatus" class="cf-status" role="status" aria-live="polite">상장 종목 목록 불러오는 중</div></div>
    <div class="cf-search-band"><form id="cfSearchForm" class="cf-search-wrap" autocomplete="off"><label class="cf-label" for="cfSearch">기업명 / 티커</label><div class="cf-input-row"><input id="cfSearch" placeholder="AAPL, Apple, 애플" aria-controls="cfResults" aria-expanded="false" aria-autocomplete="list"><button class="cf-icon-btn" type="submit" title="기업 검색" aria-label="기업 검색"><i data-lucide="search"></i></button></div><div id="cfResults" class="cf-results" hidden></div></form>
    <label><span class="cf-label">회계 분기</span><select id="cfPeriod" aria-label="회계 분기"><option>최근 분기</option></select></label>
    <label><span class="cf-label">표시 단위</span><select id="cfUnit" aria-label="표시 단위"><option value="1000000000">십억 (B)</option><option value="1000000">백만 (M)</option><option value="1">원금액</option></select></label>
    <button id="cfRefresh" class="cf-icon-btn" title="기업 데이터 새로고침" aria-label="기업 데이터 새로고침"><i data-lucide="refresh-cw"></i></button></div>
    <div id="cfContent" aria-live="polite"><div class="cf-empty">기업 데이터 불러오는 중</div></div>
    <details class="cf-method"><summary>산출 기준과 데이터 범위</summary>
      <p><b>회계 분기:</b> 기업의 최근 보고 분기를 기준으로 비교합니다. 전분기(QoQ)는 1분기 전, 전년 동기(YoY)는 4분기 전입니다. 과거 분기 표시는 제공처의 순서를 따르며, 확인되지 않은 과거 결산일은 임의로 붙이지 않습니다. 반기·연간 공시 기업은 분기 비교가 제한됩니다.</p>
      <p><b>변화율:</b> 비교 기준이 양수이면 (현재 − 비교 기준) ÷ 비교 기준 × 100입니다. 음수에서 양수로 바뀌면 흑자 전환, 그 반대는 적자 전환으로 표시합니다. 음수끼리는 적자 확대·축소, 기준이 0이면 비율 계산 불가로 표시합니다. CAPEX 증가·감소 자체는 투자 성과를 뜻하지 않습니다.</p>
      <p><b>CAPEX:</b> 현금흐름표의 자본적 지출을 양수로 표시합니다. 유지보수와 성장투자는 표준화된 분리 자료가 없어 자동 구분하지 않습니다. ‘분리 자료 없음’은 지출이 0이라는 뜻이 아닙니다. 감가상각을 유지보수 CAPEX로 대체하지 않습니다.</p>
      <p><b>FCF·EPS:</b> FCF는 영업현금흐름에서 자본적 지출을 뺀 제공처의 표준화 수치입니다. 회사가 발표하는 조정 FCF와 다를 수 있습니다. EPS는 제공처의 희석 EPS이며 주식분할·ADR·통화 변환 등 조정 기준에 따라 원문과 차이가 있을 수 있습니다. 금융회사의 FCF·영업이익은 일반 제조업과 직접 비교하기 어렵습니다.</p>
      <p><b>출처·갱신:</b> TradingView 재무 데이터입니다. 화면 진입과 새로고침 때 최신 값을 요청하며, 연결 실패 시 수집 시각이 표시된 저장 자료를 사용합니다. 저장 자료는 월~토 매일 자동 갱신합니다. 공시 즉시 반영을 보장하지 않습니다. 영업이익의 과거 자료는 현재 제공되지 않아 저장된 분기부터 누적됩니다. 미제공·미공시는 0으로 바꾸지 않습니다.</p>
    </details></div>`;
  window.lucide?.createIcons();
  el('cfSearch').addEventListener('input',showResults);
  el('cfSearch').addEventListener('focus',()=>{if(el('cfSearch').value)showResults();});
  el('cfSearch').addEventListener('keydown',event=>{
    if(event.key==='Escape')hideResults();
    if(event.key==='ArrowDown'){event.preventDefault();el('cfResults').querySelector('button')?.focus();}
  });
  el('cfResults').addEventListener('keydown',event=>{
    if(event.key==='Escape'){hideResults();el('cfSearch').focus();}
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){
      event.preventDefault();const buttons=[...el('cfResults').querySelectorAll('button')];
      buttons[(buttons.indexOf(document.activeElement)+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();
    }
  });
  el('cfSearchForm').addEventListener('submit',event=>{event.preventDefault();const matches=findCompanies(el('cfSearch').value);if(matches[0])selectCompany(matches[0]);else showResults();});
  el('cfRefresh').addEventListener('click',()=>state.symbol?loadCompany(state.symbol):loadIndex());
  el('cfUnit').addEventListener('change',()=>{state.unit=Number(el('cfUnit').value);renderCompany();});
  el('cfPeriod').addEventListener('change',()=>{state.offset=Number(el('cfPeriod').value);renderCompany();});
  document.addEventListener('click',event=>{if(!event.target.closest('#cfSearchForm'))hideResults();});
  new MutationObserver(()=>drawChart()).observe(document.body,{attributes:true,attributeFilter:['class']});
}
function hideResults(){if(el('cfResults')){el('cfResults').hidden=true;el('cfSearch').setAttribute('aria-expanded','false');}}
function findCompanies(query){
  const normalized=query.trim().toUpperCase();if(!normalized)return [];
  const alias=aliases[query.replace(/\s/g,'')];
  const target=alias||normalized;
  return state.companies.filter(c=>c.ticker.toUpperCase().includes(target)||c.name.toUpperCase().includes(target)||c.symbol===target)
    .sort((a,b)=>Number(b.ticker.toUpperCase()===target)-Number(a.ticker.toUpperCase()===target)||Number(b.ticker.toUpperCase().startsWith(target))-Number(a.ticker.toUpperCase().startsWith(target))).slice(0,12);
}
function showResults(){
  const matches=findCompanies(el('cfSearch').value);
  el('cfResults').innerHTML=matches.length?matches.map(c=>`<button type="button" class="cf-result" data-symbol="${escape(c.symbol)}"><b>${escape(c.ticker)}</b><span>${escape(c.name)}<small>${escape(c.exchange)}${c.available?'':' · 재무 자료 미확인'}</small></span></button>`).join(''):'<div class="cf-result-empty">일치하는 기업이 없습니다. 영문 기업명 또는 티커를 확인해 주세요.</div>';
  for(const button of el('cfResults').querySelectorAll('button'))button.addEventListener('click',()=>selectCompany(state.companies.find(c=>c.symbol===button.dataset.symbol)));
  el('cfResults').hidden=false;el('cfSearch').setAttribute('aria-expanded','true');
}
function selectCompany(company){if(!company)return;hideResults();el('cfSearch').value=company.ticker;state.offset=0;loadCompany(company.symbol);}
async function loadIndex(){
  try{
    const index=await getJson('data/company-financials/index.json?v='+new Date().toISOString().slice(0,10));
    if(!Array.isArray(index.companies)||!index.companies.length)throw Error('Empty index');
    state.companies=index.companies;
    el('cfUniverse').textContent=state.companies.length.toLocaleString('ko-KR')+'개 종목 · 재무 데이터 '+state.companies.filter(c=>c.available).length.toLocaleString('ko-KR')+'개';
    const initial=state.companies.find(c=>c.symbol==='NASDAQ:AAPL')||state.companies.find(c=>c.available);
    if(initial)selectCompany(initial);
  }catch{el('cfStatus').textContent='기업 목록 연결 실패';el('cfContent').innerHTML='<div class="cf-empty">종목 목록을 불러오지 못했습니다. 새로고침 버튼으로 다시 연결할 수 있습니다.</div>';}
}
async function loadCompany(symbol){
  state.controller?.abort();state.controller=new AbortController();const signal=state.controller.signal;
  const sequence=++state.sequence;state.symbol=symbol;state.company=null;
  state.chart?.destroy();state.chart=null;
  el('cfRefresh').disabled=true;el('cfPeriod').disabled=true;
  el('cfContent').innerHTML='<div class="cf-empty">'+escape(symbol)+' 재무 데이터 불러오는 중</div>';
  el('cfStatus').textContent='최근 분기 실적 연결 중';
  try{
    let cached=null;
    try{cached=await getJson('data/company-financials/'+fileKey(symbol)+'.json?v='+new Date().toISOString().slice(0,10),{},signal);}catch{}
    if(sequence!==state.sequence)return;
    if(cached?.symbol===symbol){state.company=cached;renderCompany();}
    let live=null;
    try{
      const data=await getJson('https://scanner.tradingview.com/america/scan',{method:'POST',body:JSON.stringify({symbols:{tickers:[symbol]},columns:COLUMNS})},signal);
      const row=data.data?.find(r=>r.s===symbol);
      if(row){const candidate=normalizeTradingView(row,new Date().toISOString(),cached);if(Object.values(candidate.metrics).some(m=>finite(m.current)))live=candidate;}
    }catch{}
    if(sequence!==state.sequence)return;
    if(live){state.company=live;state.company.cache=false;}
    else if(cached){state.company=cached;state.company.cache=true;}
    else throw Error('No financials');
    renderCompany();
    el('cfStatus').textContent=(live?'TradingView 조회':'저장 자료 · 최신 자료 미확인')+' · '+stamp(state.company.fetchedAt)+' KST';
  }catch{
    if(sequence!==state.sequence)return;
    const listing=state.companies.find(c=>c.symbol===symbol);
    el('cfStatus').textContent='재무 데이터 연결 실패';
    el('cfContent').innerHTML=`<h2 class="cf-company-name">${escape(listing?.name||symbol)}</h2><div class="cf-empty">사용 가능한 재무 자료를 불러오지 못했습니다.</div><div class="cf-links"><a href="${tvLink({symbol})}" target="_blank" rel="noopener noreferrer">TradingView 재무제표 ↗</a></div>`;
  }finally{if(sequence===state.sequence)el('cfRefresh').disabled=false;}
}
function comparisonHtml(history,delta,label,key){
  const result=compare(history[state.offset],history[state.offset+delta]);
  const title=result.delta===null?'비교할 과거 수치가 없습니다.':'비교 기준 '+amount(history[state.offset+delta],key,true)+' / 증감액 '+amount(result.delta,key,true);
  return `<div class="cf-comparison" title="${escape(title)}"><span>${label}</span><b class="cf-${key==='capex'?'muted':result.tone}">${escape(result.text)}</b></div>`;
}
function renderCompany(){
  const c=state.company;if(!c)return;
  const length=Math.max(1,...Object.values(c.metrics).map(m=>m.history.length));
  state.offset=Math.min(state.offset,length-1);
  el('cfPeriod').innerHTML=Array.from({length},(_,i)=>`<option value="${i}" ${i===state.offset?'selected':''}>${periodLabel(i)}</option>`).join('');
  el('cfPeriod').disabled=false;
  const unitText=c.currency?(state.unit===1?'원금액':state.unit===1e9?'십억':'백만')+' '+c.currency:'통화 확인 불가';
  const cards=DEFINITIONS.map(d=>{
    const history=c.metrics[d.key].history;
    return `<button type="button" class="cf-metric" style="--metric-tone:${d.tone}" data-metric="${d.key}" aria-pressed="${state.metric===d.key}" title="${escape(d.name)} 분기 추이"><span class="cf-metric-title">${d.name}</span><span class="cf-metric-sub">${d.ko}</span><span class="cf-value">${escape(amount(history[state.offset],d.key))}</span><span class="cf-raw">${escape(amount(history[state.offset],d.key,true))}</span>${comparisonHtml(history,1,'전분기 QoQ',d.key)}${comparisonHtml(history,4,'전년 동기 YoY',d.key)}</button>`;
  }).join('');
  const rows=Array.from({length},(_,i)=>`<tr><td>${periodLabel(i)}</td>${DEFINITIONS.map(d=>`<td>${escape(amount(c.metrics[d.key].history[i],d.key))}</td>`).join('')}</tr>`).join('');
  el('cfContent').innerHTML=`<div class="cf-company-head"><div><div class="cf-company-code">${escape(c.symbol)} · ${escape(c.sector||'')}</div><h2 class="cf-company-name">${escape(c.name)}</h2><div class="cf-meta">최근 분기 기준일 ${escape(c.periodEnd||'미제공')} · ${escape(periodLabel(state.offset))} · ${escape(unitText)}</div></div><div class="cf-links"><a href="${tvLink(c)}" target="_blank" rel="noopener noreferrer">TradingView 재무제표 ↗</a><a href="https://www.sec.gov/edgar/search/#/q=${encodeURIComponent(c.ticker)}&filter_forms=10-K%252C10-Q" target="_blank" rel="noopener noreferrer">SEC 공시 검색 ↗</a></div></div>
    ${!c.quarterly?'<div class="cf-alert">분기 공시 주기가 확인되지 않아 전분기·전년 동기 비교를 제한합니다. 최근 제공 수치의 보고 기간은 원문에서 확인해 주세요.</div>':''}
    ${c.cache?'<div class="cf-note">최신 자료를 확인하지 못해 마지막으로 수집한 값을 표시합니다. 상단의 수집 시각과 분기 기준일을 확인해 주세요.</div>':''}<div class="cf-metrics">${cards}</div>
    <div class="cf-capex"><div><h3>유지보수 CAPEX</h3><strong>분리 자료 없음</strong></div><div><h3>성장투자 CAPEX</h3><strong>분리 자료 없음</strong></div><p class="cf-note">총 CAPEX 중 유지보수·성장투자 비중은 기업별 공시 확인이 필요합니다. 미제공 값을 0이나 추정 비율로 표시하지 않습니다.</p></div>
    <section class="cf-chart-section"><div class="cf-chart-head"><h2 id="cfChartTitle"></h2><span id="cfChartNote" class="cf-note"></span></div><div class="cf-chart"><canvas id="cfChartCanvas" role="img" aria-label="분기 실적 추이. 아래 표에서 같은 수치를 확인할 수 있습니다."></canvas></div></section>
    <div class="cf-history" tabindex="0" role="region" aria-label="기업 분기 실적 표"><table><thead><tr><th>회계 분기</th>${DEFINITIONS.map(d=>`<th scope="col">${d.name}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;
  for(const card of root.querySelectorAll('.cf-metric'))card.addEventListener('click',()=>{state.metric=card.dataset.metric;for(const b of root.querySelectorAll('.cf-metric'))b.setAttribute('aria-pressed',String(b===card));drawChart();});
  drawChart();
}
function drawChart(){
  const canvas=el('cfChartCanvas');if(!state.company||!canvas||!window.Chart)return;
  state.chart?.destroy();
  const def=DEFINITIONS.find(d=>d.key===state.metric),history=state.company.metrics[state.metric].history;
  const end=Math.min(history.length,state.offset+12);
  const offsets=Array.from({length:Math.max(1,end-state.offset)},(_,i)=>end-i-1);
  el('cfChartTitle').textContent=def.name+' · 분기 추이';
  el('cfChartNote').textContent=history.filter(finite).length<2?'과거 값 미제공 · 현재 값만 표시':(state.company.currency||'통화 미확인')+' · '+(def.key==='eps'?'주당 금액':state.unit===1e9?'십억 (B)':state.unit===1e6?'백만 (M)':'원금액');
  const color=getComputedStyle(root).getPropertyValue('--text-mid').trim();
  state.chart=new window.Chart(canvas,{
    type:'bar',
    data:{labels:offsets.map(periodLabel),datasets:[{
      label:def.name,data:offsets.map(i=>finite(history[i])?history[i]/(def.key==='eps'?1:state.unit):null),
      backgroundColor:def.tone+'b0',borderColor:def.tone,borderWidth:1,borderRadius:2,maxBarThickness:48,
    }]},
    options:{
      responsive:true,maintainAspectRatio:false,animation:false,
      interaction:{mode:'index',intersect:false},
      plugins:{legend:{display:false},tooltip:{callbacks:{
        title:items=>periodLabel(offsets[items[0].dataIndex]),
        label:item=>amount(history[offsets[item.dataIndex]],def.key,true),
        afterLabel:item=>{const i=offsets[item.dataIndex];return ['전분기: '+compare(history[i],history[i+1]).text,'전년 동기: '+compare(history[i],history[i+4]).text];},
      }}},
      scales:{
        x:{ticks:{color,maxRotation:0,autoSkip:true,maxTicksLimit:6,font:{size:10}},grid:{display:false}},
        y:{ticks:{color,font:{size:10}},grid:{color:'#71849b22'}},
      },
    },
  });
}
function open(){if(!state.initialized){state.initialized=true;shell();loadIndex();}else{state.chart?.resize();}}
window.addEventListener('company-view-open',open);
if(document.body.classList.contains('company-mode'))open();

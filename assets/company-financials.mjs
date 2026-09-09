import {mountWidget} from './tradingview-widgets.mjs';
import {compare} from './company-financials-model.mjs?v=20260909-licensed';

const root=document.getElementById('companyDashboard');
// Hand-maintained shortcuts, not an extracted provider directory.
const companies=[['AAPL','NASDAQ','Apple','애플'],['MSFT','NASDAQ','Microsoft','마이크로소프트'],['NVDA','NASDAQ','NVIDIA','엔비디아'],['AMZN','NASDAQ','Amazon','아마존'],['GOOGL','NASDAQ','Alphabet','구글'],['META','NASDAQ','Meta','메타'],['TSLA','NASDAQ','Tesla','테슬라'],['PLTR','NASDAQ','Palantir','팔란티어'],['AVGO','NASDAQ','Broadcom','브로드컴'],['JPM','NYSE','JPMorgan Chase','제이피모건'],['BRK.B','NYSE','Berkshire Hathaway','버크셔'],['KO','NYSE','Coca-Cola','코카콜라'],['TSM','NYSE','TSMC','티에스엠씨'],['CPNG','NYSE','Coupang','쿠팡']];
const metrics=[['capex','CAPEX'],['fcf','Free Cash Flow'],['eps','EPS'],['revenue','매출액'],['operatingIncome','영업이익']];
let initialized=false,symbol='NASDAQ:AAPL',lastTheme=null;
function renderWidget(){
  if(!initialized)return;
  const theme=document.body.classList.contains('light')?'light':'dark';lastTheme=theme;
  document.getElementById('cfCurrentSymbol').textContent=symbol;
  const company=companies.find(c=>c[1]+':'+c[0]===symbol);
  document.getElementById('cfCompanyName').textContent=company?company[2]:symbol.split(':')[1];
  const base='https://www.tradingview.com/symbols/'+encodeURIComponent(symbol.replace(':','-'));
  document.getElementById('cfIncomeLink').href=base+'/financials-income-statement/';
  document.getElementById('cfCashLink').href=base+'/financials-cash-flow/';
  document.getElementById('cfSecLink').href='https://www.sec.gov/edgar/browse/?CIK='+encodeURIComponent(symbol.split(':')[1])+'&owner=exclude';
  mountWidget(document.getElementById('cfFundamentals'),'financials',{symbol,colorTheme:theme,displayMode:'regular',isTransparent:false,width:'100%',height:830,locale:'kr'},'기업 재무 정보',base+'/financials-income-statement/');
}
function selectCompany(event){
  event?.preventDefault();
  const input=document.getElementById('cfSearch'),value=input.value.trim();
  const known=companies.find(c=>[c[0],c[2],c[3]].some(v=>v.toLowerCase()===value.toLowerCase()));
  const chosen=known?known[1]+':'+known[0]:value.includes(':')?value.toUpperCase():document.getElementById('cfExchange').value+':'+value.toUpperCase();
  if(!/^(NASDAQ|NYSE|AMEX):[A-Z0-9][A-Z0-9.-]{0,15}$/.test(chosen)){
    input.setCustomValidity('티커 또는 거래소:티커를 입력해 주세요.');input.reportValidity();return;
  }
  input.setCustomValidity('');symbol=chosen;
  document.getElementById('cfExchange').value=chosen.split(':')[0];
  document.getElementById('cfCalculatorForm').reset();calculate();renderWidget();
}
function calculate(){
  for(const [key]of metrics){
    const value=suffix=>{const input=document.getElementById(key+'-'+suffix);return !input.validity.valid||input.value.trim()===''?null:Number(input.value);};
    for(const [period,suffix]of [['qoq','previous'],['yoy','year']]){
      const result=compare(value('current'),value(suffix));
      const output=document.getElementById(key+'-'+period);output.textContent=result.text;output.className='cf-'+(key==='capex'?'muted':result.tone);
    }
  }
}
function renderScreener(){
  mountWidget(document.getElementById('cfScreener'),'screener',{width:'100%',height:550,defaultColumn:'overview',defaultScreen:'general',market:'america',showToolbar:true,colorTheme:lastTheme,locale:'kr'},'미국 종목 스크리너','https://www.tradingview.com/screener/');
}
function selectTab(name){
  document.querySelectorAll('.cf-tab').forEach(tab=>{
    const active=tab.dataset.panel===name;
    tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;
    document.getElementById('cf-panel-'+tab.dataset.panel).hidden=!active;
  });
  if(name==='directory'&&!document.getElementById('cfScreener').children.length)renderScreener();
}
function initialize(){
  if(initialized)return;initialized=true;
  root.innerHTML=`<div class="cf-shell"><div class="cf-top"><div><div class="cf-eyebrow">06 / COMPANY FINANCIALS</div><h1>미국 기업 재무 분석</h1></div><span class="cf-provider"><i data-lucide="external-link"></i>TradingView 공식 위젯</span></div>
  <form id="cfCompanyForm" class="cf-search-band"><div class="cf-search-wrap"><label class="cf-label" for="cfSearch">기업명 / 티커</label><input id="cfSearch" value="AAPL" list="cfCommonCompanies" placeholder="AAPL 또는 NASDAQ:AAPL" required><datalist id="cfCommonCompanies">${companies.map(c=>`<option value="${c[0]}">${c[2]} · ${c[3]}</option>`).join('')}</datalist></div><label><span class="cf-label">거래소</span><select id="cfExchange"><option>NASDAQ</option><option>NYSE</option><option>AMEX</option></select></label><button type="submit" class="cf-icon-btn cf-search-submit" title="기업 조회" aria-label="기업 조회"><i data-lucide="search"></i></button></form>
  <div class="cf-company-head"><div class="cf-identity"><div class="cf-company-mark" aria-hidden="true"><i data-lucide="building-2"></i></div><div><h2 id="cfCompanyName" class="cf-company-name"></h2><div id="cfCurrentSymbol" class="cf-company-code"></div></div></div><div class="cf-links"><a id="cfIncomeLink" target="_blank" rel="noopener noreferrer">손익계산서<i data-lucide="arrow-up-right"></i></a><a id="cfCashLink" target="_blank" rel="noopener noreferrer">현금흐름표<i data-lucide="arrow-up-right"></i></a><a id="cfSecLink" target="_blank" rel="noopener noreferrer">SEC 공시<i data-lucide="arrow-up-right"></i></a></div></div>
  <div class="cf-tabs" role="tablist" aria-label="기업 재무 보기">${[['financials','재무 현황','chart-no-axes-combined'],['directory','종목 탐색','list-filter'],['calculator','성장률 계산','calculator']].map(([id,label,icon])=>`<button type="button" role="tab" class="cf-tab" id="cf-tab-${id}" data-panel="${id}" aria-controls="cf-panel-${id}" aria-selected="${id==='financials'}" tabindex="${id==='financials'?0:-1}"><i data-lucide="${icon}"></i>${label}</button>`).join('')}</div>
  <section id="cf-panel-financials" class="cf-panel" role="tabpanel" aria-labelledby="cf-tab-financials"><div class="cf-section-head"><div><h3>재무제표 개요</h3><p class="cf-meta">기업 공시 기준 · 제공처 반영 시 갱신</p></div><button id="cfReload" type="button" class="cf-icon-btn" title="재무 위젯 새로고침" aria-label="재무 위젯 새로고침"><i data-lucide="refresh-cw"></i></button></div><div class="cf-widget-scroll" role="region" aria-label="기업 재무 표" tabindex="0"><div id="cfFundamentals" class="cf-official-widget"></div></div></section>
  <section id="cf-panel-directory" class="cf-panel" role="tabpanel" aria-labelledby="cf-tab-directory" hidden><div class="cf-section-head"><h3>미국 상장 종목</h3></div><div class="cf-widget-scroll" role="region" aria-label="미국 종목 스크리너" tabindex="0"><div id="cfScreener" class="cf-screener"></div></div></section>
  <section id="cf-panel-calculator" class="cf-panel" role="tabpanel" aria-labelledby="cf-tab-calculator" hidden><div class="cf-section-head"><div><h3>분기 실적 비교</h3><p class="cf-meta">공시 수치 직접 입력 · 입력값 저장 안 함</p></div><button type="reset" form="cfCalculatorForm" class="cf-icon-btn" title="입력값 초기화" aria-label="입력값 초기화"><i data-lucide="rotate-ccw"></i></button></div>
  <form id="cfCalculatorForm"><div class="cf-calculator"><table><thead><tr><th>항목</th><th>현재 분기</th><th>전분기</th><th>전년 동기</th><th>QoQ</th><th>YoY</th></tr></thead><tbody>${metrics.map(([key,label])=>`<tr><th scope="row">${label}</th>${[['current','현재 분기'],['previous','전분기'],['year','전년 동기']].map(([id,title])=>`<td><input type="number" step="any" ${key==='capex'?'min="0"':''} id="${key}-${id}" aria-label="${label} ${title}"></td>`).join('')}<td><output id="${key}-qoq">과거 데이터 없음</output></td><td><output id="${key}-yoy">과거 데이터 없음</output></td></tr>`).join('')}</tbody></table></div></form><p class="cf-calculator-caption">동일 통화·단위의 개별 분기 기준. CAPEX는 양수 지출액, EPS는 주당 금액입니다.</p></section>
  <details class="cf-method"><summary>자료 기준 및 CAPEX 분류</summary><p>지원 항목과 갱신 시점은 TradingView 기준입니다. 발표 직후 반영을 보장하지 않으며, 분기·연간·최근 12개월(TTM) 구분은 원문 표기를 따릅니다.</p><div class="cf-capex"><div><h3>유지보수 CAPEX</h3><strong>기업별 공시 확인</strong></div><div><h3>성장투자 CAPEX</h3><strong>기업별 공시 확인</strong></div><p class="cf-note">두 항목을 구분해서 공시하지 않는 기업은 자동 분리할 수 없습니다. 감가상각을 유지보수 CAPEX로 대체하거나 추정 비율을 적용하지 않습니다.</p></div></details></div>`;
  window.lucide?.createIcons();
  document.getElementById('cfCompanyForm').addEventListener('submit',selectCompany);
  document.getElementById('cfSearch').addEventListener('input',e=>e.target.setCustomValidity(''));
  document.getElementById('cfReload').addEventListener('click',renderWidget);
  document.getElementById('cfCalculatorForm').addEventListener('input',calculate);
  document.getElementById('cfCalculatorForm').addEventListener('reset',()=>setTimeout(calculate));
  const tabs=[...document.querySelectorAll('.cf-tab')];
  tabs.forEach((tab,index)=>{
    tab.addEventListener('click',()=>selectTab(tab.dataset.panel));
    tab.addEventListener('keydown',event=>{
      const next=event.key==='ArrowRight'?(index+1)%tabs.length:event.key==='ArrowLeft'?(index+tabs.length-1)%tabs.length:event.key==='Home'?0:event.key==='End'?tabs.length-1:null;
      if(next===null)return;event.preventDefault();selectTab(tabs[next].dataset.panel);tabs[next].focus();
    });
  });
  new MutationObserver(()=>{if(lastTheme!==(document.body.classList.contains('light')?'light':'dark')){renderWidget();if(document.getElementById('cfScreener').children.length)renderScreener();}}).observe(document.body,{attributes:true,attributeFilter:['class']});
  renderWidget();
}
window.addEventListener('company-view-open',initialize);
if(document.body.classList.contains('company-mode'))initialize();

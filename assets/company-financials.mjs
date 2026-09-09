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
function initialize(){
  if(initialized)return;initialized=true;
  root.innerHTML=`<div class="cf-shell"><div class="cf-top"><div><div class="cf-eyebrow">06 / COMPANY FINANCIALS</div><h1>미국 기업 재무 분석</h1></div><span class="cf-meta">TradingView 공식 제공 화면</span></div>
  <form id="cfCompanyForm" class="cf-search-band"><div class="cf-search-wrap"><label class="cf-label" for="cfSearch">기업명 / 티커</label><input id="cfSearch" value="AAPL" list="cfCommonCompanies" placeholder="AAPL 또는 NASDAQ:AAPL" required><datalist id="cfCommonCompanies">${companies.map(c=>`<option value="${c[0]}">${c[2]} · ${c[3]}</option>`).join('')}</datalist></div><label><span class="cf-label">거래소</span><select id="cfExchange"><option>NASDAQ</option><option>NYSE</option><option>AMEX</option></select></label><button type="submit" class="cf-icon-btn" title="기업 조회" aria-label="기업 조회"><i data-lucide="search"></i></button><button id="cfReload" type="button" class="cf-icon-btn" title="위젯 다시 열기" aria-label="위젯 다시 열기"><i data-lucide="refresh-cw"></i></button></form>
  <div class="cf-company-head"><h2 id="cfCurrentSymbol" class="cf-company-name"></h2><div class="cf-links"><a id="cfIncomeLink" target="_blank" rel="noopener noreferrer">손익계산서 ↗</a><a id="cfCashLink" target="_blank" rel="noopener noreferrer">현금흐름표 ↗</a><a id="cfSecLink" target="_blank" rel="noopener noreferrer">SEC 공시 ↗</a></div></div>
  <p class="cf-note">표시 항목과 지원 종목은 제공처 기준입니다. 위젯에서 지원하지 않는 수치·증감률은 원문 재무제표에서 확인할 수 있습니다.</p><div id="cfFundamentals" class="cf-official-widget"></div>
  <details id="cfDirectory" class="cf-method"><summary>미국 상장 종목 찾기</summary><div id="cfScreener" class="cf-screener"></div></details>
  <details class="cf-method"><summary>공시 수치로 전분기·전년 동기 변화율 계산</summary><p>같은 통화·단위의 개별 분기 수치를 입력합니다. 입력값은 이 화면에서만 계산하며 서버에 저장하지 않습니다. CAPEX는 양수 지출액, EPS는 주당 금액 기준입니다.</p>
  <form id="cfCalculatorForm"><div class="cf-calculator"><table><thead><tr><th>항목</th><th>현재 분기</th><th>전분기</th><th>전년 동기</th><th>QoQ</th><th>YoY</th></tr></thead><tbody>${metrics.map(([key,label])=>`<tr><th scope="row">${label}</th>${[['current','현재 분기'],['previous','전분기'],['year','전년 동기']].map(([id,title])=>`<td><input type="number" step="any" ${key==='capex'?'min="0"':''} id="${key}-${id}" aria-label="${label} ${title}"></td>`).join('')}<td><output id="${key}-qoq">과거 데이터 없음</output></td><td><output id="${key}-yoy">과거 데이터 없음</output></td></tr>`).join('')}</tbody></table></div><button type="reset" class="cf-clear">입력값 지우기</button></form></details>
  <div class="cf-capex"><div><h3>유지보수 CAPEX</h3><strong>기업별 공시 확인</strong></div><div><h3>성장투자 CAPEX</h3><strong>기업별 공시 확인</strong></div><p class="cf-note">두 항목을 구분해서 공시하지 않는 기업은 자동 분리할 수 없습니다. 감가상각을 유지보수 CAPEX로 대체하거나 추정 비율을 적용하지 않습니다.</p></div></div>`;
  window.lucide?.createIcons();
  document.getElementById('cfCompanyForm').addEventListener('submit',selectCompany);
  document.getElementById('cfSearch').addEventListener('input',e=>e.target.setCustomValidity(''));
  document.getElementById('cfReload').addEventListener('click',renderWidget);
  document.getElementById('cfCalculatorForm').addEventListener('input',calculate);
  document.getElementById('cfCalculatorForm').addEventListener('reset',()=>setTimeout(calculate));
  document.getElementById('cfDirectory').addEventListener('toggle',e=>{
    if(e.target.open&&!document.getElementById('cfScreener').children.length)mountWidget(document.getElementById('cfScreener'),'screener',{width:'100%',height:550,defaultColumn:'overview',defaultScreen:'general',market:'america',showToolbar:true,colorTheme:lastTheme,locale:'kr'},'미국 종목 스크리너','https://www.tradingview.com/screener/');
  });
  new MutationObserver(()=>{if(lastTheme!==(document.body.classList.contains('light')?'light':'dark'))renderWidget();}).observe(document.body,{attributes:true,attributeFilter:['class']});
  renderWidget();
}
window.addEventListener('company-view-open',initialize);
if(document.body.classList.contains('company-mode'))initialize();

const allowed=new Set(['financials','screener','single-quote','mini-symbol-overview']);
export function mountWidget(host,type,config,label,url){
  if(!host||!allowed.has(type))return;
  const container=document.createElement('div');container.className='tradingview-widget-container';
  const widget=document.createElement('div');widget.className='tradingview-widget-container__widget';
  const attribution=document.createElement('div');attribution.className='tradingview-widget-copyright';
  const link=document.createElement('a');link.href=url;link.target='_blank';link.rel='noopener nofollow';
  const title=document.createElement('span');title.className='blue-text';title.textContent=label;
  link.append(title);attribution.append(link,document.createTextNode(' by TradingView'));
  const script=document.createElement('script');script.type='text/javascript';script.async=true;
  script.src='https://s3.tradingview.com/external-embedding/embed-widget-'+type+'.js';
  script.textContent=JSON.stringify(config);
  script.onerror=()=>{const message=document.createElement('p');message.className='cf-note';message.textContent='위젯 연결 실패 · 원문 링크에서 확인할 수 있습니다.';widget.replaceChildren(message);};
  container.append(widget,attribution,script);host.replaceChildren(container);
}
window.mountOfficialTradingViewWidget=mountWidget;

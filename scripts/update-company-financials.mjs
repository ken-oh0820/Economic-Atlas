import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {COLUMNS,fileKey,normalizeTradingView} from '../assets/company-financials-model.mjs';

const output=fileURLToPath(new URL('../data/company-financials/',import.meta.url));
await mkdir(output,{recursive:true});
const fetchedAt=new Date().toISOString();
const rows=[];
for(let start=0;start<20000;start+=500){
  const response=await fetch('https://scanner.tradingview.com/america/scan',{
    method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(45000),
    body:JSON.stringify({filter:[{left:'type',operation:'in_range',right:['stock','dr']},{left:'exchange',operation:'in_range',right:['NASDAQ','NYSE','AMEX','CBOE']}],
      columns:COLUMNS,sort:{sortBy:'name',sortOrder:'asc'},range:[start,start+500]})});
  if(!response.ok)throw new Error('TradingView '+response.status+'; previous snapshot preserved');
  const page=await response.json();
  if(!Array.isArray(page.data))throw new Error('Invalid provider response');
  rows.push(...page.data);
  console.log(`Received ${rows.length} / ${page.totalCount}`);
  if(rows.length>=page.totalCount||!page.data.length)break;
  await new Promise(resolve=>setTimeout(resolve,1000));
}
if(rows.length<1000)throw new Error('Incomplete universe; previous index preserved');
const companies=[];
for(const row of rows){
  let key;
  try{key=fileKey(row.s);}catch{continue;}
  let previous=null;
  try{previous=JSON.parse(await readFile(join(output,key+'.json'),'utf8'));}catch{}
  const company=normalizeTradingView(row,fetchedAt,previous);
  if(!company.ticker||!company.name)continue;
  await writeFile(join(output,key+'.json'),JSON.stringify(company)+'\n');
  companies.push({symbol:company.symbol,ticker:company.ticker,name:company.name,exchange:company.exchange,
    available:Object.values(company.metrics).some(m=>m.current!==null)});
}
await writeFile(join(output,'index.json'),JSON.stringify({schemaVersion:1,source:'TradingView',updatedAt:fetchedAt,companies})+'\n');
console.log(`Published ${companies.length} securities; ${companies.filter(c=>c.available).length} with financials`);

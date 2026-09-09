import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,access} from 'node:fs/promises';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
test('no direct TradingView collection or company snapshot pipeline',async()=>{
  for(const folder of ['assets/','scripts/','workers/','.github/workflows/']){
    for(const name of await readdir(new URL(folder,root),{recursive:true})){
      if(!/\.(?:m?js|ya?ml)$/.test(name)||name.endsWith('.test.mjs'))continue;
      const text=await readFile(new URL(folder+name.replaceAll('\\','/'),root),'utf8');
      assert.doesNotMatch(text,/(scanner|symbol-search)\.tradingview\.com/,name);
    }
  }
  await assert.rejects(access(new URL('data/company-financials/',root)));
  await assert.rejects(access(new URL('.github/workflows/update-company-financials.yml',root)));
  const snapshot=JSON.parse(await readFile(new URL('data/treasury-basis.json',root),'utf8'));
  assert.equal(snapshot.liquidity,undefined);
});
test('main page scripts parse and use official display widgets',async()=>{
  const html=await readFile(new URL('index.html',root),'utf8');
  assert.doesNotMatch(html,/(scanner|symbol-search)\.tradingview\.com|fetchTradingView/);
  for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){
    if(/src=|application\/ld\+json|type="module"/.test(match[1]))continue;
    new vm.Script(match[2]);
  }
  assert.match(html,/MOVE 원문 확인/);
  const widget=await readFile(new URL('assets/tradingview-widgets.mjs',root),'utf8');
  assert.match(widget,/s3\.tradingview\.com\/external-embedding/);
  assert.match(widget,/tradingview-widget-copyright/);
  const company=await readFile(new URL('assets/company-financials.mjs',root),'utf8');
  assert.doesNotMatch(company,/\bfetch\s*\(|localStorage|sessionStorage|contentDocument|contentWindow/);
});

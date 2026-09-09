import test from 'node:test';
import assert from 'node:assert/strict';
import {COLUMNS,compare,normalizeTradingView,fileKey} from '../assets/company-financials-model.mjs';

function row(overrides={}){
  const values={name:'TEST',description:'Test issuer',exchange:'NASDAQ',last_report_frequency:4,fundamental_currency_code:'USD',
    fiscal_period_end_fq:Date.parse('2026-06-30')/1000,total_revenue_fq:120,total_revenue_fq_h:[120,100,null,85,80],
    capital_expenditures_fq:-25,capital_expenditures_unchanged_fq_h:[25,20,15,10,5],oper_income_fq:18,...overrides};
  return {s:'NASDAQ:TEST',d:COLUMNS.map(c=>values[c]??null)};
}
test('positive comparisons use previous quarter and same quarter last year',()=>{
  const company=normalizeTradingView(row());
  const h=company.metrics.revenue.history;
  assert.equal(compare(h[0],h[1]).percent,20);
  assert.equal(compare(h[0],h[4]).percent,50);
  assert.equal(h[2],null);
});
test('losses, zero and missing values do not produce misleading growth percentages',()=>{
  assert.equal(compare(10,-10).text,'흑자 전환');
  assert.equal(compare(-10,10).text,'적자 전환');
  assert.equal(compare(-5,-10).text,'적자 축소');
  assert.equal(compare(-20,-10).text,'적자 확대');
  assert.equal(compare(5,0).percent,null);
  assert.equal(compare(5,null).delta,null);
  assert.equal(compare(null,2).percent,null);
});
test('CAPEX outflow sign normalizes without changing missing values to zero',()=>{
  const c=normalizeTradingView(row());
  assert.equal(c.metrics.capex.current,25);
  assert.equal(c.metrics.capex.history[0],25);
  assert.equal(c.metrics.eps.current,null);
  assert.equal(c.metrics.operatingIncome.history[1],undefined);
});
test('inconsistent and nonquarterly histories are not attached to quarterly comparisons',()=>{
  assert.deepEqual(normalizeTradingView(row({total_revenue_fq_h:[121,100]})).metrics.revenue.history,[120]);
  assert.deepEqual(normalizeTradingView(row({last_report_frequency:2})).metrics.revenue.history,[120]);
});
test('operating income accumulates by reporting period without overwriting earlier quarters',()=>{
  const previous=normalizeTradingView(row({fiscal_period_end_fq:Date.parse('2026-03-31')/1000,oper_income_fq:15}));
  const current=normalizeTradingView(row(),'2026-09-09',previous);
  assert.deepEqual(current.metrics.operatingIncome.history,[18,15]);
  assert.equal(compare(current.metrics.operatingIncome.history[0],current.metrics.operatingIncome.history[1]).percent,20);
});
test('symbol paths cannot escape the data directory',()=>{
  assert.equal(fileKey('NYSE:BRK.B'),'NYSE_BRK.B');
  assert.throws(()=>fileKey('../../private'));
});

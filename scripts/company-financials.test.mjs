import test from 'node:test';
import assert from 'node:assert/strict';
import {compare} from '../assets/company-financials-model.mjs';
test('user-entered growth and missing values',()=>{
  assert.equal(compare(120,100).text,'+20.00%');
  assert.equal(compare(50,100).text,'-50.00%');
  assert.equal(compare(null,100).text,'과거 데이터 없음');
  assert.equal(compare(10,0).text,'비교 기준 0');
  assert.equal(compare(10,-10).text,'흑자 전환');
  assert.equal(compare(-10,10).text,'적자 전환');
  assert.equal(compare(-5,-10).text,'적자 축소');
});

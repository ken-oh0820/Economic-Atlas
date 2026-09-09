import { readFile, writeFile } from 'node:fs/promises';

const outputPath = new URL('../data/treasury-basis.json', import.meta.url);
const previous = JSON.parse(await readFile(outputPath, 'utf8'));

function fredPoints(text) {
  return text.trim().split(/\r?\n/).slice(1).map(row => {
    const split = row.indexOf(',');
    if (split < 0) return null;
    const date = row.slice(0, split).trim();
    const value = Number(row.slice(split + 1).trim());
    return date && Number.isFinite(value) ? { date, value } : null;
  }).filter(Boolean);
}

function latestFredPoint(text) {
  return fredPoints(text).at(-1);
}

async function fetchText(url, init = {}) {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${new URL(url).hostname}: ${response.status}`);
  return response.text();
}

async function fetchJson(url, init = {}) {
  return JSON.parse(await fetchText(url, init));
}

async function fetchRepo() {
  const [sofrText, iorbText] = await Promise.all([
    fetchText('https://fred.stlouisfed.org/graph/fredgraph.csv?id=SOFR'),
    fetchText('https://fred.stlouisfed.org/graph/fredgraph.csv?id=IORB'),
  ]);
  const sofr = latestFredPoint(sofrText);
  const iorb = latestFredPoint(iorbText);
  if (!sofr || !iorb) throw new Error('FRED repo series unavailable');
  return {
    sofr: sofr.value,
    iorb: iorb.value,
    date: sofr.date < iorb.date ? sofr.date : iorb.date,
    source: 'NY Fed/FRED',
  };
}

async function fetchMortgage() {
  const text = await fetchText('https://fred.stlouisfed.org/graph/fredgraph.csv?id=MORTGAGE30US');
  const points = fredPoints(text);
  const last = points.at(-1);
  const prev = points.at(-2);
  if (!last || !prev) throw new Error('FRED mortgage series unavailable');
  const target = new Date(`${last.date}T00:00:00Z`).getTime() - 30 * 86400000;
  const month = [...points].reverse().find(point => new Date(`${point.date}T00:00:00Z`).getTime() <= target) || prev;
  return {
    value: last.value,
    prev: prev.value,
    month: month.value,
    date: last.date,
    source: 'Freddie Mac/FRED',
  };
}

async function fetchPosition() {
  const mnemonic = 'TFF-LF_TREAS_NET_POS10YREQV';
  const start = new Date(Date.now() - 370 * 86400000).toISOString().slice(0, 10);
  const url = `https://data.financialresearch.gov/hf/v1/series/full?mnemonic=${mnemonic}&start_date=${start}&remove_nulls=true`;
  const data = await fetchJson(url);
  const points = (data?.[mnemonic]?.timeseries?.aggregation || [])
    .map(([date, value]) => ({ date, value: Number(value) }))
    .filter(point => Number.isFinite(point.value));
  const last = points.at(-1);
  const prior = points.at(-2);
  if (!last || !prior) throw new Error('OFR position series unavailable');
  return { value: last.value, prev: prior.value, date: last.date, source: 'OFR/CFTC' };
}

async function fetchOpenInterest() {
  const params = new URLSearchParams({
    '$select': 'report_date_as_yyyy_mm_dd,contract_market_name,open_interest_all,change_in_open_interest_all',
    '$where': "commodity_subgroup_name='Interest Rates - U.S. Treasury'",
    '$order': 'report_date_as_yyyy_mm_dd DESC',
    '$limit': '20',
  });
  const rows = await fetchJson(`https://publicreporting.cftc.gov/resource/gpe5-46if.json?${params}`);
  const latestDate = rows?.[0]?.report_date_as_yyyy_mm_dd;
  const latest = rows.filter(row => row.report_date_as_yyyy_mm_dd === latestDate && !String(row.contract_market_name || '').includes('MICRO'));
  const value = latest.reduce((sum, row) => sum + Number(row.open_interest_all || 0), 0);
  const change = latest.reduce((sum, row) => sum + Number(row.change_in_open_interest_all || 0), 0);
  if (!value) throw new Error('CFTC open interest unavailable');
  return { value, change, date: latestDate.slice(0, 10), source: 'CFTC TFF' };
}

const results = await Promise.allSettled([fetchRepo(), fetchPosition(), fetchOpenInterest(), fetchMortgage()]);
const next = {
  updatedAt: previous.updatedAt,
  repo: results[0].status === 'fulfilled' ? results[0].value : previous.repo,
  position: results[1].status === 'fulfilled' ? results[1].value : previous.position,
  openInterest: results[2].status === 'fulfilled' ? results[2].value : previous.openInterest,
  mortgage: results[3].status === 'fulfilled' ? results[3].value : previous.mortgage,
};

const signature = value => JSON.stringify({ ...value, updatedAt: '' });
if (signature(next) !== signature(previous)) {
  next.updatedAt = new Date().toISOString();
  await writeFile(outputPath, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`Market rate snapshot updated: ${results.filter(result => result.status === 'fulfilled').length}/4 sources`);
} else {
  console.log('Treasury basis snapshot is already current');
}

for (const result of results) {
  if (result.status === 'rejected') console.warn(result.reason?.message || result.reason);
}

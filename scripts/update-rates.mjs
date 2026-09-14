import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CBC_API_URL = 'https://cpx.cbc.gov.tw/API/DataAPI/Get?FileName=BP01D01';
const FRANKFURTER_ALL_URL = 'https://api.frankfurter.dev/v2/rates?base=USD';
const FRANKFURTER_CBC_URL = 'https://api.frankfurter.dev/v2/rates?base=USD&providers=CBC';

const CBC_CODES = new Set(['TWD','JPY','USD','EUR','CNY','HKD','KRW','SGD','GBP','AUD','CAD','THB','MYR','PHP','IDR']);
const CODE_ALIASES = { NTD: 'TWD', TWD: 'TWD' };
const CODE_RE = /(NTD|TWD|JPY|GBP|HKD|KRW|CAD|SGD|CNY|AUD|IDR|THB|MYR|PHP|EUR|USD)(?:\s*\/\s*USD)?/i;
const DATE_RE = /(?:19|20)\d{2}[\/-]\d{1,2}[\/-]\d{1,2}/;

function normalizeCode(text) {
  const m = String(text ?? '').toUpperCase().match(CODE_RE);
  if (!m) return null;
  return CODE_ALIASES[m[1]] || m[1];
}

function normalizeDate(value) {
  const m = String(value ?? '').match(DATE_RE);
  if (!m) return '';
  const [y, mo, d] = m[0].replace(/-/g, '/').split('/');
  return `${y}-${String(Number(mo)).padStart(2,'0')}-${String(Number(d)).padStart(2,'0')}`;
}

function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/,/g, '').trim();
  if (!/^[-+]?\d+(?:\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function assignRate(target, code, value, date) {
  if (!code || !CBC_CODES.has(code)) return;
  const n = toNumber(value);
  if (!(n > 0)) return;
  const oldDate = target.dates[code] || '';
  if (!oldDate || !date || date >= oldDate) {
    target.rates[code] = n;
    if (date) target.dates[code] = date;
  }
}

function parseTabularArray(arr, target) {
  if (!Array.isArray(arr) || arr.length < 2 || !Array.isArray(arr[0])) return;
  const header = arr[0].map(x => String(x ?? ''));
  const codeIndexes = header.map(normalizeCode);
  const dateIndex = header.findIndex(x => /date|time|period|日期/i.test(x));
  if (codeIndexes.filter(Boolean).length < 2 || dateIndex < 0) return;
  for (let r = 1; r < arr.length; r++) {
    if (!Array.isArray(arr[r])) continue;
    const date = normalizeDate(arr[r][dateIndex]);
    codeIndexes.forEach((code, i) => { if (code) assignRate(target, code, arr[r][i], date); });
  }
}

function parseOfficialCbc(payload) {
  const target = { rates: { USD: 1 }, dates: {}, latestDate: '' };
  const seen = new WeakSet();

  function visit(node, inheritedCode = null) {
    if (!node || typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);

    if (Array.isArray(node)) {
      parseTabularArray(node, target);
      for (const item of node) visit(item, inheritedCode);
      return;
    }

    const entries = Object.entries(node);
    let localCode = inheritedCode;
    let date = '';

    for (const [key, value] of entries) {
      if (typeof value === 'string' || typeof value === 'number') {
        const code = normalizeCode(key) || normalizeCode(value);
        if (code && CBC_CODES.has(code)) localCode = code;
        if (/date|time|period|日期|年月日/i.test(key)) date = normalizeDate(value) || date;
        if (!date) date = normalizeDate(value) || date;
      }
    }

    for (const [key, value] of entries) {
      const code = normalizeCode(key);
      if (code) assignRate(target, code, value, date);
    }

    if (localCode) {
      let explicitDate = date;
      let explicitValue = null;
      for (const [key, value] of entries) {
        if (/date|time|period|日期|年月日/i.test(key)) explicitDate = normalizeDate(value) || explicitDate;
        if (/obs.?value|value|rate|數值|資料值|匯率/i.test(key)) {
          const n = toNumber(value);
          if (n !== null) explicitValue = n;
        }
      }
      if (explicitDate && explicitValue !== null) assignRate(target, localCode, explicitValue, explicitDate);
    }

    for (const [key, value] of entries) {
      if (value && typeof value === 'object') visit(value, normalizeCode(key) || localCode);
    }
  }

  visit(payload);
  for (const d of Object.values(target.dates)) if (d > target.latestDate) target.latestDate = d;
  const usable = Object.keys(target.rates).filter(c => c !== 'USD');
  if (usable.length < 6) throw new Error(`中央銀行 API 解析到的幣別不足：${usable.length}`);
  return target;
}

function normalizeFrankfurter(rows) {
  if (!Array.isArray(rows)) throw new Error('Frankfurter 回傳格式錯誤');
  const rates = { USD: 1 };
  let date = '';
  for (const row of rows) {
    const code = String(row?.quote || '').toUpperCase();
    const n = Number(row?.rate);
    if (/^[A-Z]{3}$/.test(code) && Number.isFinite(n) && n > 0) rates[code] = n;
    if (row?.date && String(row.date) > date) date = String(row.date);
  }
  return { rates, date };
}

async function jsonFetch(url, label) {
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'fx-mobile-github-pages/1.2.0' }
  });
  if (!res.ok) throw new Error(`${label} HTTP ${res.status}`);
  return res.json();
}

async function getCbcRates() {
  try {
    const official = parseOfficialCbc(await jsonFetch(CBC_API_URL, 'CBC'));
    return { rates: official.rates, date: official.latestDate, mode: 'official-api' };
  } catch (officialError) {
    console.warn('CBC official API failed; using Frankfurter CBC provider fallback:', officialError.message);
    const proxy = normalizeFrankfurter(await jsonFetch(FRANKFURTER_CBC_URL, 'Frankfurter CBC provider'));
    const rates = { USD: 1 };
    for (const [code, value] of Object.entries(proxy.rates)) if (CBC_CODES.has(code)) rates[code] = value;
    if (Object.keys(rates).length < 6) throw officialError;
    return { rates, date: proxy.date, mode: 'frankfurter-cbc-provider' };
  }
}

async function main() {
  const [cbc, frankfurter] = await Promise.all([
    getCbcRates(),
    jsonFetch(FRANKFURTER_ALL_URL, 'Frankfurter').then(normalizeFrankfurter)
  ]);

  const rates = { ...frankfurter.rates, USD: 1 };
  for (const [code, value] of Object.entries(cbc.rates)) {
    if (CBC_CODES.has(code) && Number.isFinite(Number(value)) && Number(value) > 0) rates[code] = Number(value);
  }

  const now = Date.now();
  const payload = {
    base: 'USD',
    rates,
    cbcDate: cbc.date || null,
    frankfurterDate: frankfurter.date || null,
    cbcMode: cbc.mode,
    source: cbc.mode === 'official-api'
      ? '台灣中央銀行統計資料庫 BP01D01（主流幣別）＋Frankfurter v2（其他幣別）'
      : 'CBC provider 備援（主流幣別）＋Frankfurter v2（其他幣別）',
    generatedAt: now,
    generatedAtIso: new Date(now).toISOString()
  };

  const here = path.dirname(fileURLToPath(import.meta.url));
  const targetDir = path.resolve(here, '../data');
  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(path.join(targetDir, 'rates.json'), JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`Updated ${Object.keys(rates).length} rates. CBC mode: ${cbc.mode}.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

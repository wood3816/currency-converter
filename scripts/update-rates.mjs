import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FRANKFURTER_ALL_URL = 'https://api.frankfurter.dev/v2/rates?base=USD';
// Frankfurter 官方文件提供的 CBC 專屬 provider route。
// 資料來源仍是 Central Bank of the Republic of China (Taiwan)。
const FRANKFURTER_CBC_URL = 'https://api.frankfurter.dev/v2/providers/cbc/rates?base=USD';

const CBC_CODES = new Set([
  'TWD','JPY','USD','EUR','CNY','HKD','KRW','SGD','GBP','AUD','CAD','THB','MYR','PHP','IDR'
]);

function normalizeFrankfurter(payload) {
  // v2 正常格式：[{ date, base, quote, rate }, ...]
  if (Array.isArray(payload)) {
    const rates = { USD: 1 };
    let date = '';
    for (const row of payload) {
      const code = String(row?.quote || '').toUpperCase();
      const n = Number(row?.rate);
      if (/^[A-Z]{3}$/.test(code) && Number.isFinite(n) && n > 0) rates[code] = n;
      if (row?.date && String(row.date) > date) date = String(row.date);
    }
    return { rates, date };
  }

  // 額外容錯：若 API 回傳物件型 rates 也能處理。
  if (payload && typeof payload === 'object' && payload.rates && typeof payload.rates === 'object') {
    const rates = { USD: 1 };
    for (const [codeRaw, value] of Object.entries(payload.rates)) {
      const code = String(codeRaw).toUpperCase();
      const n = Number(value);
      if (/^[A-Z]{3}$/.test(code) && Number.isFinite(n) && n > 0) rates[code] = n;
    }
    return { rates, date: String(payload.date || '') };
  }

  throw new Error('Frankfurter 回傳格式錯誤');
}

async function jsonFetch(url, label) {
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'fx-mobile-github-pages/1.2.4'
    }
  });
  if (!res.ok) throw new Error(`${label} HTTP ${res.status}`);
  return res.json();
}

function validRateCount(rates) {
  return Object.entries(rates || {}).filter(([code, value]) =>
    /^[A-Z]{3}$/.test(code) && Number.isFinite(Number(value)) && Number(value) > 0
  ).length;
}

async function readExistingRates(targetFile) {
  try {
    const raw = JSON.parse(await fs.readFile(targetFile, 'utf8'));
    if (raw?.rates && validRateCount(raw.rates) >= 5) return raw;
  } catch {}
  return null;
}

async function main() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const targetDir = path.resolve(here, '../data');
  const targetFile = path.join(targetDir, 'rates.json');
  await fs.mkdir(targetDir, { recursive: true });

  const [cbcResult, allResult] = await Promise.allSettled([
    jsonFetch(FRANKFURTER_CBC_URL, 'Frankfurter CBC provider').then(normalizeFrankfurter),
    jsonFetch(FRANKFURTER_ALL_URL, 'Frankfurter public API').then(normalizeFrankfurter)
  ]);

  const cbc = cbcResult.status === 'fulfilled' ? cbcResult.value : null;
  const all = allResult.status === 'fulfilled' ? allResult.value : null;

  if (!cbc) console.warn('CBC provider 暫時無法取得：', cbcResult.reason?.message || cbcResult.reason);
  if (!all) console.warn('Frankfurter 公開匯率暫時無法取得：', allResult.reason?.message || allResult.reason);

  // 兩個來源都失效時，不讓 Pages 因暫時性 API 問題直接掛掉；若已有舊資料就沿用。
  if (!cbc && !all) {
    const existing = await readExistingRates(targetFile);
    if (existing) {
      console.warn('兩個遠端來源皆失敗，沿用 repository 內既有 rates.json。');
      return;
    }
    throw new Error('無法取得任何匯率，而且 repository 內沒有可用的既有 rates.json');
  }

  // 先以一般 Frankfurter 補齊所有幣別，再用 CBC provider 覆蓋主流幣別。
  const rates = { USD: 1, ...(all?.rates || {}) };
  let cbcMode = 'frankfurter-general-fallback';

  const cbcUsable = cbc && validRateCount(cbc.rates) >= 6;
  if (cbcUsable) {
    for (const [code, value] of Object.entries(cbc.rates)) {
      const n = Number(value);
      if (CBC_CODES.has(code) && Number.isFinite(n) && n > 0) rates[code] = n;
    }
    cbcMode = 'frankfurter-cbc-provider';
  } else {
    console.warn('CBC provider 可用幣別不足，主流幣別暫用 Frankfurter 一般匯率備援。');
  }

  if (validRateCount(rates) < 5) {
    const existing = await readExistingRates(targetFile);
    if (existing) {
      console.warn('本次取得的匯率不足，沿用 repository 內既有 rates.json。');
      return;
    }
    throw new Error(`可用匯率不足：${validRateCount(rates)}`);
  }

  const now = Date.now();
  const payload = {
    base: 'USD',
    rates,
    cbcDate: cbc?.date || null,
    frankfurterDate: all?.date || null,
    cbcMode,
    source: cbcUsable
      ? '台灣中央銀行資料（Frankfurter CBC provider）＋Frankfurter v2（其他幣別）'
      : 'Frankfurter v2 備援（CBC provider 暫時不可用）',
    generatedAt: now,
    generatedAtIso: new Date(now).toISOString()
  };

  await fs.writeFile(targetFile, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`Updated ${validRateCount(rates)} rates. CBC mode: ${cbcMode}.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

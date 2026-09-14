(() => {
  'use strict';

  const APP_VERSION = '1.2.2';
  const RATE_TTL_MS = 2 * 60 * 60 * 1000;
  const CACHE_KEY = 'fx-rate-cache-gh-v3';
  const LEGACY_CACHE_KEY = 'fx-rate-cache-gh-v2';
  const PREF_KEY = 'fx-user-prefs-gh-v2';
  const LEGACY_PREF_KEY = 'fx-user-prefs-gh-v1';
  const PRIMARY_API_URL = './data/rates.json';
  const DIRECT_CBC_FALLBACK = 'https://api.frankfurter.dev/v2/providers/cbc/rates?base=USD';
  const DIRECT_FRANKFURTER = 'https://api.frankfurter.dev/v2/rates?base=USD';

  const CURRENCIES = {
    TWD: { name: '新臺幣', flag: '🇹🇼', symbol: 'NT$', cbc: true },
    JPY: { name: '日圓', flag: '🇯🇵', symbol: '¥', cbc: true },
    USD: { name: '美元', flag: '🇺🇸', symbol: '$', cbc: true },
    EUR: { name: '歐元', flag: '🇪🇺', symbol: '€', cbc: true },
    CNY: { name: '人民幣', flag: '🇨🇳', symbol: '¥', cbc: true },
    HKD: { name: '港幣', flag: '🇭🇰', symbol: 'HK$', cbc: true },
    KRW: { name: '韓元', flag: '🇰🇷', symbol: '₩', cbc: true },
    SGD: { name: '新加坡幣', flag: '🇸🇬', symbol: 'S$', cbc: true },
    GBP: { name: '英鎊', flag: '🇬🇧', symbol: '£', cbc: true },
    AUD: { name: '澳幣', flag: '🇦🇺', symbol: 'A$', cbc: true },
    CAD: { name: '加拿大幣', flag: '🇨🇦', symbol: 'C$', cbc: true },
    THB: { name: '泰銖', flag: '🇹🇭', symbol: '฿', cbc: true },
    MYR: { name: '馬來西亞令吉', flag: '🇲🇾', symbol: 'RM', cbc: true },
    PHP: { name: '菲律賓披索', flag: '🇵🇭', symbol: '₱', cbc: true },
    IDR: { name: '印尼盾', flag: '🇮🇩', symbol: 'Rp', cbc: true },
    CHF: { name: '瑞士法郎', flag: '🇨🇭', symbol: 'CHF' },
    NZD: { name: '紐西蘭幣', flag: '🇳🇿', symbol: 'NZ$' },
    INR: { name: '印度盧比', flag: '🇮🇳', symbol: '₹' },
    VND: { name: '越南盾', flag: '🇻🇳', symbol: '₫' },
    AED: { name: '阿聯酋迪拉姆', flag: '🇦🇪', symbol: 'د.إ' },
    SAR: { name: '沙烏地里亞爾', flag: '🇸🇦', symbol: '﷼' },
    TRY: { name: '土耳其里拉', flag: '🇹🇷', symbol: '₺' },
    SEK: { name: '瑞典克朗', flag: '🇸🇪', symbol: 'kr' },
    NOK: { name: '挪威克朗', flag: '🇳🇴', symbol: 'kr' },
    DKK: { name: '丹麥克朗', flag: '🇩🇰', symbol: 'kr' },
    PLN: { name: '波蘭茲羅提', flag: '🇵🇱', symbol: 'zł' },
    CZK: { name: '捷克克朗', flag: '🇨🇿', symbol: 'Kč' },
    MXN: { name: '墨西哥披索', flag: '🇲🇽', symbol: 'MX$' },
    BRL: { name: '巴西里亞爾', flag: '🇧🇷', symbol: 'R$' },
    ZAR: { name: '南非蘭特', flag: '🇿🇦', symbol: 'R' },
    ILS: { name: '以色列新謝克爾', flag: '🇮🇱', symbol: '₪' }
  };
  const DEFAULT_VISIBLE = ['JPY', 'TWD', 'USD', 'EUR', 'CNY', 'HKD', 'KRW', 'SGD'];

  const $ = s => document.querySelector(s);
  const els = {
    fromCurrency: $('#fromCurrency'), toCurrency: $('#toCurrency'),
    fromCurrencyBtn: $('#fromCurrencyBtn'), toCurrencyBtn: $('#toCurrencyBtn'),
    fromFlag: $('#fromFlag'), fromName: $('#fromName'), fromCode: $('#fromCode'),
    toFlag: $('#toFlag'), toName: $('#toName'), toCode: $('#toCode'),
    fromAmount: $('#fromAmount'), toAmount: $('#toAmount'),
    refreshBtn: $('#refreshBtn'), menuBtn: $('#menuBtn'), keypad: $('.keypad'),
    menuDialog: $('#menuDialog'), menuClose: $('#menuClose'), menuHome: $('#menuHome'), menuFavorites: $('#menuFavorites'),
    menuAdd: $('#menuAdd'), menuRates: $('#menuRates'), menuRefresh: $('#menuRefresh'), versionText: $('#versionText'),
    statusDot: $('#statusDot'), statusText: $('#statusText'), checkedLine: $('#checkedLine'),
    currencyDialog: $('#currencyDialog'), currencyClose: $('#currencyClose'), currencySearch: $('#currencySearch'),
    currencyList: $('#currencyList'), currencySave: $('#currencySave'), currencyReset: $('#currencyReset'),
    favoriteDialog: $('#favoriteDialog'), favoriteClose: $('#favoriteClose'), favoriteGrid: $('#favoriteGrid'),
    favoriteTitle: $('#favoriteTitle'), favoriteHint: $('#favoriteHint'),
    rateDialog: $('#rateDialog'), rateClose: $('#rateClose'), rateList: $('#rateList'),
    unitDialog: $('#unitDialog'), unitClose: $('#unitClose'), unitBase: $('#unitBase'), unitBaseLabel: $('#unitBaseLabel'),
    unitOpBtn: $('#unitOpBtn'), unitOpMenu: $('#unitOpMenu'), unitOpLabel: $('#unitOpLabel'),
    unitCount: $('#unitCount'), unitResult: $('#unitResult'), unitApply: $('#unitApply'),
    themeRadios: [...document.querySelectorAll('input[name="theme"]')], toast: $('#toast')
  };

  const prefs = loadPrefs();
  let rateCache = loadRateCache();
  let activeSide = 'from';
  let currencyPickSide = 'from';
  let fromInput = prefs.fromInput || '100000';
  let toInput = '0';
  let tempVisible = new Set(prefs.visibleCurrencies);
  let toastTimer = null;
  let holdTimeout = null;
  let holdInterval = null;
  let heldButton = null;
  let resizeTimer = null;
  let unitOperator = '*';

  function sanitizeInput(value) {
    let v = String(value ?? '').replace(/[^0-9.]/g, '');
    const firstDot = v.indexOf('.');
    if (firstDot >= 0) v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, '');
    let [whole = '0', decimal] = v.split('.');
    whole = whole.replace(/^0+(?=\d)/, '').slice(0, 12) || '0';
    if (decimal !== undefined) decimal = decimal.slice(0, 3);
    return decimal !== undefined ? `${whole}.${decimal}` : whole;
  }

  function loadPrefs() {
    try {
      const stored = localStorage.getItem(PREF_KEY) || localStorage.getItem(LEGACY_PREF_KEY) || '{}';
      const raw = JSON.parse(stored);
      const visible = Array.isArray(raw.visibleCurrencies) ? raw.visibleCurrencies.filter(code => CURRENCIES[code]) : DEFAULT_VISIBLE;
      const theme = ['light', 'dark', 'system'].includes(raw.theme) ? raw.theme : 'system';
      return {
        from: CURRENCIES[raw.from] ? raw.from : 'JPY',
        to: CURRENCIES[raw.to] ? raw.to : 'TWD',
        fromInput: sanitizeInput(raw.fromInput || '100000'),
        visibleCurrencies: visible.length >= 2 ? visible : [...DEFAULT_VISIBLE],
        theme
      };
    } catch {
      return { from: 'JPY', to: 'TWD', fromInput: '100000', visibleCurrencies: [...DEFAULT_VISIBLE], theme: 'system' };
    }
  }

  function savePrefs() {
    localStorage.setItem(PREF_KEY, JSON.stringify({
      from: els.fromCurrency.value,
      to: els.toCurrency.value,
      fromInput,
      visibleCurrencies: prefs.visibleCurrencies,
      theme: prefs.theme
    }));
  }

  function loadRateCache() {
    try {
      const data = JSON.parse(localStorage.getItem(CACHE_KEY) || localStorage.getItem(LEGACY_CACHE_KEY) || 'null');
      return data && data.rates && typeof data.rates === 'object' ? data : null;
    } catch { return null; }
  }

  function persistRateCache(cache) {
    rateCache = cache;
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  }

  function effectiveTheme(mode = prefs.theme) {
    if (mode === 'system') return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    return mode === 'dark' ? 'dark' : 'light';
  }

  function applyTheme(mode = prefs.theme, { save = false } = {}) {
    prefs.theme = ['light', 'dark', 'system'].includes(mode) ? mode : 'system';
    const resolved = effectiveTheme(prefs.theme);
    document.documentElement.dataset.theme = resolved;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', resolved === 'dark' ? '#071a2d' : '#103f78');
    els.themeRadios.forEach(radio => { radio.checked = radio.value === prefs.theme; });
    if (save) savePrefs();
  }

  function currencyOption(code) {
    const c = CURRENCIES[code];
    return `<option value="${code}">${c.flag} ${c.name} (${code})</option>`;
  }

  function buildCurrencyOptions() {
    const currentFrom = els.fromCurrency.value || prefs.from;
    const currentTo = els.toCurrency.value || prefs.to;
    const html = prefs.visibleCurrencies.map(currencyOption).join('');
    els.fromCurrency.innerHTML = html;
    els.toCurrency.innerHTML = html;
    els.fromCurrency.value = prefs.visibleCurrencies.includes(currentFrom) ? currentFrom : prefs.visibleCurrencies[0];
    const fallback = prefs.visibleCurrencies.find(c => c !== els.fromCurrency.value) || prefs.visibleCurrencies[0];
    els.toCurrency.value = prefs.visibleCurrencies.includes(currentTo) ? currentTo : fallback;
    if (els.fromCurrency.value === els.toCurrency.value) els.toCurrency.value = fallback;
    renderCurrencyButtons();
  }

  function renderCurrencyButton(side, code) {
    const c = CURRENCIES[code];
    if (!c) return;
    const flag = side === 'from' ? els.fromFlag : els.toFlag;
    const name = side === 'from' ? els.fromName : els.toName;
    const codeEl = side === 'from' ? els.fromCode : els.toCode;
    const btn = side === 'from' ? els.fromCurrencyBtn : els.toCurrencyBtn;
    flag.textContent = c.flag;
    name.textContent = c.name;
    name.classList.toggle('long', c.name.length >= 5);
    codeEl.textContent = `(${code})`;
    btn.setAttribute('aria-label', `${side === 'from' ? '從貨幣' : '到貨幣'}：${c.name} ${code}，點選更換`);
  }

  function renderCurrencyButtons() {
    renderCurrencyButton('from', els.fromCurrency.value);
    renderCurrencyButton('to', els.toCurrency.value);
  }

  function renderCurrencyManager(filter = '') {
    const needle = filter.trim().toLowerCase();
    els.currencyList.innerHTML = Object.entries(CURRENCIES)
      .filter(([code, c]) => !needle || `${code} ${c.name}`.toLowerCase().includes(needle))
      .map(([code, c]) => `<label class="currency-item">
        <span class="flag">${c.flag}</span>
        <span><span class="name">${c.name}</span><span class="source-tag">${c.cbc ? '中央銀行' : 'Frankfurter'}</span><br><span class="code">${code} · ${c.symbol}</span></span>
        <input type="checkbox" value="${code}" ${tempVisible.has(code) ? 'checked' : ''} />
      </label>`).join('');
  }

  function renderFavorites() {
    els.favoriteGrid.innerHTML = prefs.visibleCurrencies.map(code => {
      const c = CURRENCIES[code];
      return `<button type="button" data-favorite="${code}">${c.flag} ${c.name}<small>${code}</small></button>`;
    }).join('');
  }

  function renderRateList() {
    const rows = prefs.visibleCurrencies.map(code => {
      const c = CURRENCIES[code];
      const twd = currencyRate(code, 'TWD');
      const value = Number.isFinite(twd) ? formatRate(twd) : '—';
      return `<div class="rate-row">
        <span class="flag">${c.flag}</span>
        <span class="rate-name"><strong>${c.name} (${code})</strong><small>${c.cbc ? '中央銀行資料' : 'Frankfurter 資料'}</small></span>
        <span class="rate-value">${value}<small>TWD / 1 ${code}</small></span>
      </div>`;
    }).join('');
    els.rateList.innerHTML = rows || '<p>尚未選擇幣別。</p>';
  }

  function setActiveSide(side) {
    activeSide = side;
    els.fromAmount.classList.toggle('active', side === 'from');
    els.toAmount.classList.toggle('active', side === 'to');
  }

  function numericValue(value) {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : 0;
  }

  function currencyRate(from, to) {
    if (from === to) return 1;
    if (!rateCache?.rates) return null;
    const fromPerUsd = from === 'USD' ? 1 : Number(rateCache.rates[from]);
    const toPerUsd = to === 'USD' ? 1 : Number(rateCache.rates[to]);
    if (!Number.isFinite(fromPerUsd) || !Number.isFinite(toPerUsd) || fromPerUsd <= 0 || toPerUsd <= 0) return null;
    return toPerUsd / fromPerUsd;
  }

  function formatInputForDisplay(v) {
    if (!v) return '0';
    const trailingDot = v.endsWith('.');
    const [whole, decimal] = v.split('.');
    const wholeFormatted = new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 0 }).format(Number(whole || 0));
    if (trailingDot) return `${wholeFormatted}.`;
    return decimal !== undefined ? `${wholeFormatted}.${decimal}` : wholeFormatted;
  }

  function formatAmount(num) {
    if (!Number.isFinite(num)) return '—';
    return new Intl.NumberFormat('zh-TW', { minimumFractionDigits: 0, maximumFractionDigits: 3, useGrouping: true }).format(num);
  }

  function formatConvertedAmount(num) {
    if (!Number.isFinite(num)) return '—';
    return new Intl.NumberFormat('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true }).format(num);
  }

  function formatRate(num) {
    if (!Number.isFinite(num)) return '—';
    if (num >= 1000) return new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 2 }).format(num);
    if (num >= 1) return new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 4 }).format(num);
    return new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 7 }).format(num);
  }

  function maxFittingFont(el, max) {
    if (!el || !el.clientWidth) return max;
    const min = 27;
    let low = min;
    let high = max;
    el.style.fontSize = `${max}px`;
    for (let i = 0; i < 9; i++) {
      const mid = (low + high) / 2;
      el.style.fontSize = `${mid}px`;
      if (el.scrollWidth <= el.clientWidth - 20) low = mid;
      else high = mid;
    }
    return Math.floor(low);
  }

  function fitAmountsTogether() {
    if (!els.fromAmount.clientWidth || !els.toAmount.clientWidth) return;
    const baseHeight = Math.min(els.fromAmount.clientHeight, els.toAmount.clientHeight);
    const max = Math.min(110, Math.max(70, baseHeight * .86));
    const fromFit = maxFittingFont(els.fromAmount, max);
    const toFit = maxFittingFont(els.toAmount, max);
    const shared = Math.min(fromFit, toFit);
    els.fromAmount.style.fontSize = `${shared}px`;
    els.toAmount.style.fontSize = `${shared}px`;
  }

  function fitAmountsSoon() {
    requestAnimationFrame(fitAmountsTogether);
  }

  function recalc() {
    renderCurrencyButtons();
    const from = els.fromCurrency.value;
    const to = els.toCurrency.value;
    const rate = currencyRate(from, to);
    if (rate === null) {
      els.fromAmount.textContent = activeSide === 'from' ? formatInputForDisplay(fromInput) : formatAmount(numericValue(fromInput));
      els.toAmount.textContent = '—';
      fitAmountsSoon();
      savePrefs();
      return;
    }

    if (activeSide === 'from') toInput = sanitizeInput(String(numericValue(fromInput) * rate));
    else fromInput = sanitizeInput(String(numericValue(toInput) / rate));

    els.fromAmount.textContent = activeSide === 'from' ? formatInputForDisplay(fromInput) : formatAmount(numericValue(fromInput));
    els.toAmount.textContent = activeSide === 'to' ? formatInputForDisplay(toInput) : formatConvertedAmount(numericValue(toInput));
    fitAmountsSoon();
    savePrefs();
  }

  function handleKey(key) {
    if (key === 'swap') return swapCurrencies();
    if (key === 'unit') return openUnitCalculator();
    let current = activeSide === 'from' ? fromInput : toInput;
    if (key === 'clear') current = '0';
    else if (key === 'back') current = current.length <= 1 ? '0' : current.slice(0, -1);
    else if (key === '.') {
      if (!current.includes('.')) current += '.';
    } else if (key === '00') {
      if (current !== '0') current += '00';
    } else {
      current = current === '0' ? key : current + key;
    }
    current = sanitizeInput(current);
    if (activeSide === 'from') fromInput = current; else toInput = current;
    recalc();
  }

  function swapCurrencies() {
    const oldFromCode = els.fromCurrency.value;
    const oldFromValue = fromInput;
    const oldToValue = toInput;
    els.fromCurrency.value = els.toCurrency.value;
    els.toCurrency.value = oldFromCode;
    if (activeSide === 'from') fromInput = sanitizeInput(String(numericValue(oldToValue)));
    else toInput = sanitizeInput(String(numericValue(oldFromValue)));
    recalc();
  }

  function normalizeV2Rows(rows) {
    if (!Array.isArray(rows)) throw new Error('Frankfurter 匯率格式錯誤');
    const rates = { USD: 1 };
    let date = '';
    for (const row of rows) {
      const code = String(row?.quote || '').toUpperCase();
      const n = Number(row?.rate);
      if (CURRENCIES[code] && Number.isFinite(n) && n > 0) rates[code] = n;
      if (row?.date && row.date > date) date = row.date;
    }
    return { rates, date };
  }

  function normalizePayload(payload) {
    if (!payload?.rates || typeof payload.rates !== 'object') throw new Error('匯率格式錯誤');
    const rates = { USD: 1 };
    for (const [code, value] of Object.entries(payload.rates)) {
      const n = Number(value);
      if (CURRENCIES[code] && Number.isFinite(n) && n > 0) rates[code] = n;
    }
    if (Object.keys(rates).length < 5) throw new Error('可用匯率不足');
    return {
      rates,
      fetchedAt: Number(payload.generatedAt) || (payload.generatedAtIso ? Date.parse(payload.generatedAtIso) : Date.now()),
      cbcDate: payload.cbcDate || '',
      frankfurterDate: payload.frankfurterDate || '',
      cbcMode: payload.cbcMode || 'official',
      source: payload.source || '台灣中央銀行＋Frankfurter'
    };
  }

  async function fetchPrimaryRates() {
    const url = `${PRIMARY_API_URL}?t=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`primary HTTP ${res.status}`);
    return normalizePayload(await res.json());
  }

  async function fetchDirectFallback() {
    const [cbcRes, frankRes] = await Promise.all([
      fetch(DIRECT_CBC_FALLBACK, { cache: 'no-store' }),
      fetch(DIRECT_FRANKFURTER, { cache: 'no-store' })
    ]);
    if (!cbcRes.ok || !frankRes.ok) throw new Error(`fallback HTTP ${cbcRes.status}/${frankRes.status}`);
    const cbc = normalizeV2Rows(await cbcRes.json());
    const frank = normalizeV2Rows(await frankRes.json());
    const rates = { ...frank.rates, USD: 1 };
    for (const [code, value] of Object.entries(cbc.rates)) {
      if (CURRENCIES[code]?.cbc) rates[code] = value;
    }
    return {
      rates,
      fetchedAt: Date.now(),
      cbcDate: cbc.date,
      frankfurterDate: frank.date,
      cbcMode: 'frankfurter-cbc-provider',
      source: 'Frankfurter CBC provider＋Frankfurter public API'
    };
  }

  function formatDateTime(ms) {
    if (!ms) return '—';
    return new Intl.DateTimeFormat('zh-TW', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
    }).format(new Date(ms));
  }

  function updateDataStatus(mode = null, text = null) {
    const has = Boolean(rateCache?.rates);
    let state = mode;
    let label = text;
    if (!state) {
      if (!has) { state = navigator.onLine ? 'checking' : 'error'; label = navigator.onLine ? '等待匯率' : '首次需先連線'; }
      else if (!navigator.onLine) { state = 'offline'; label = '離線快取'; }
      else { state = 'normal'; label = '資料正常'; }
    }
    els.statusDot.className = `status-dot ${state}`;
    els.statusText.textContent = label;
    const checked = rateCache?.fetchedAt ? formatDateTime(rateCache.fetchedAt) : '—';
    els.checkedLine.textContent = `更新：${checked}`;
  }

  async function refreshRates({ force = false, quiet = false } = {}) {
    if (!navigator.onLine) {
      updateDataStatus();
      recalc();
      if (!quiet) showToast('目前離線，使用最後快取匯率');
      return false;
    }
    const fresh = rateCache && Date.now() - Number(rateCache.fetchedAt || 0) < RATE_TTL_MS;
    if (fresh && !force) { updateDataStatus(); recalc(); return true; }

    try {
      els.refreshBtn.disabled = true;
      els.refreshBtn.textContent = '…';
      updateDataStatus('checking', '更新中');
      let cache;
      try {
        cache = await fetchPrimaryRates();
      } catch (primaryError) {
        console.warn('GitHub Pages 匯率檔暫時無法使用，改用瀏覽器備援', primaryError);
        cache = await fetchDirectFallback();
      }
      persistRateCache(cache);
      updateDataStatus();
      recalc();
      if (!quiet) showToast('匯率已更新');
      return true;
    } catch (error) {
      console.error(error);
      updateDataStatus(rateCache ? 'offline' : 'error', rateCache ? '更新失敗・使用快取' : '匯率資料異常');
      recalc();
      if (!quiet) showToast(rateCache ? '更新失敗，已保留快取' : '更新失敗，請確認網路');
      return false;
    } finally {
      els.refreshBtn.disabled = false;
      els.refreshBtn.textContent = '↻';
    }
  }

  function openMenu() {
    updateDataStatus();
    if (!els.menuDialog.open) els.menuDialog.showModal();
  }

  function openCurrencyDialog() {
    tempVisible = new Set(prefs.visibleCurrencies);
    els.currencySearch.value = '';
    renderCurrencyManager();
    if (els.menuDialog.open) els.menuDialog.close();
    els.currencyDialog.showModal();
  }

  function saveCurrencySelection() {
    const selected = Object.keys(CURRENCIES).filter(code => tempVisible.has(code));
    if (selected.length < 2) return showToast('至少保留 2 種幣別');
    prefs.visibleCurrencies = selected;
    buildCurrencyOptions();
    savePrefs();
    els.currencyDialog.close();
    recalc();
    showToast(`已啟用 ${selected.length} 種幣別`);
  }

  function openFavorites(side = activeSide) {
    currencyPickSide = side === 'to' ? 'to' : 'from';
    if (els.menuDialog.open) els.menuDialog.close();
    const label = currencyPickSide === 'from' ? '從貨幣' : '到貨幣';
    els.favoriteTitle.textContent = `選擇${label}`;
    els.favoriteHint.textContent = `國旗與中文名稱固定顯示，幣別代碼會自動換到第二行。`;
    renderFavorites();
    els.favoriteDialog.showModal();
  }

  function openRateList() {
    if (els.menuDialog.open) els.menuDialog.close();
    renderRateList();
    els.rateDialog.showModal();
  }

  function closeUnitOpMenu() {
    els.unitOpMenu.hidden = true;
    els.unitOpBtn.setAttribute('aria-expanded', 'false');
  }

  function updateUnitOperatorUI() {
    els.unitOpLabel.textContent = unitOperator === '/' ? '÷ 除以' : '× 乘以';
    els.unitOpMenu.querySelectorAll('[data-unit-op]').forEach(option => {
      const selected = option.dataset.unitOp === unitOperator;
      option.classList.toggle('selected', selected);
      option.setAttribute('aria-selected', selected ? 'true' : 'false');
    });
  }

  function openUnitCalculator() {
    const base = numericValue(toInput);
    const toCode = els.toCurrency.value;
    els.unitBaseLabel.textContent = `轉換後金額（${toCode}）：`;
    els.unitBase.textContent = formatConvertedAmount(base);
    els.unitCount.value = '';
    els.unitResult.textContent = formatConvertedAmount(base);
    unitOperator = '*';
    updateUnitOperatorUI();
    closeUnitOpMenu();
    updateUnitCalculation();
    els.unitDialog.showModal();
  }

  function updateUnitCalculation() {
    const base = numericValue(toInput);
    const count = Number.parseFloat(String(els.unitCount.value).replace(/,/g, ''));
    if (!Number.isFinite(count)) { els.unitResult.textContent = formatConvertedAmount(base); return base; }
    let result = base;
    if (unitOperator === '*') result = base * count;
    else if (unitOperator === '/') result = count === 0 ? NaN : base / count;
    els.unitResult.textContent = Number.isFinite(result) ? formatConvertedAmount(result) : '無法計算';
    return result;
  }

  function applyUnitCalculation() {
    const result = updateUnitCalculation();
    if (!Number.isFinite(result) || result < 0) return showToast('結果需為 0 以上的有效數字');
    toInput = sanitizeInput(String(result));
    setActiveSide('to');
    els.unitDialog.close();
    recalc();
    showToast(`已套用到 ${els.toCurrency.value} 轉換結果`);
  }

  function showToast(text) {
    els.toast.textContent = text;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 1600);
  }

  function stopHold() {
    clearTimeout(holdTimeout);
    clearInterval(holdInterval);
    holdTimeout = null;
    holdInterval = null;
    if (heldButton) heldButton.classList.remove('pressed');
    heldButton = null;
  }

  function initKeypadPress() {
    const start = e => {
      const btn = e.target.closest('button[data-key]');
      if (!btn) return;
      e.preventDefault();
      stopHold();
      heldButton = btn;
      btn.classList.add('pressed');
      try { btn.setPointerCapture?.(e.pointerId); } catch {}
      handleKey(btn.dataset.key);
      if (btn.dataset.repeat === 'true') {
        holdTimeout = setTimeout(() => {
          const interval = btn.dataset.key === 'back' ? 70 : 105;
          holdInterval = setInterval(() => handleKey(btn.dataset.key), interval);
        }, 380);
      }
    };
    els.keypad.addEventListener('pointerdown', start);
    els.keypad.addEventListener('pointerup', stopHold);
    els.keypad.addEventListener('pointercancel', stopHold);
    els.keypad.addEventListener('pointerleave', e => { if (e.buttons === 0) stopHold(); });
    els.keypad.addEventListener('contextmenu', e => e.preventDefault());
    els.keypad.addEventListener('selectstart', e => e.preventDefault());
    els.keypad.addEventListener('dragstart', e => e.preventDefault());
    els.keypad.addEventListener('touchstart', e => { if (e.target.closest('button[data-key]')) e.preventDefault(); }, { passive: false });
  }

  function setCurrencyOnPickSide(code) {
    if (!prefs.visibleCurrencies.includes(code)) return;
    if (currencyPickSide === 'from') {
      if (code === els.toCurrency.value) els.toCurrency.value = els.fromCurrency.value;
      els.fromCurrency.value = code;
    } else {
      if (code === els.fromCurrency.value) els.fromCurrency.value = els.toCurrency.value;
      els.toCurrency.value = code;
    }
    recalc();
  }

  function initEvents() {
    els.fromAmount.addEventListener('click', () => { setActiveSide('from'); recalc(); });
    els.toAmount.addEventListener('click', () => { setActiveSide('to'); recalc(); });
    els.fromAmount.addEventListener('contextmenu', e => e.preventDefault());
    els.toAmount.addEventListener('contextmenu', e => e.preventDefault());

    els.fromCurrencyBtn.addEventListener('click', () => openFavorites('from'));
    els.toCurrencyBtn.addEventListener('click', () => openFavorites('to'));
    els.fromCurrencyBtn.addEventListener('contextmenu', e => e.preventDefault());
    els.toCurrencyBtn.addEventListener('contextmenu', e => e.preventDefault());

    els.refreshBtn.addEventListener('click', () => refreshRates({ force: true }));
    els.menuBtn.addEventListener('click', openMenu);
    initKeypadPress();

    els.menuClose.addEventListener('click', () => els.menuDialog.close());
    els.menuHome.addEventListener('click', () => els.menuDialog.close());
    els.menuFavorites.addEventListener('click', () => openFavorites(activeSide));
    els.menuAdd.addEventListener('click', openCurrencyDialog);
    els.menuRates.addEventListener('click', openRateList);
    els.menuRefresh.addEventListener('click', () => { els.menuDialog.close(); refreshRates({ force: true }); });

    els.currencyClose.addEventListener('click', () => els.currencyDialog.close());
    els.currencySearch.addEventListener('input', e => renderCurrencyManager(e.target.value));
    els.currencyList.addEventListener('change', e => {
      const input = e.target.closest('input[type="checkbox"]');
      if (!input) return;
      if (input.checked) tempVisible.add(input.value); else tempVisible.delete(input.value);
    });
    els.currencyReset.addEventListener('click', () => { tempVisible = new Set(DEFAULT_VISIBLE); renderCurrencyManager(els.currencySearch.value); });
    els.currencySave.addEventListener('click', saveCurrencySelection);

    els.favoriteClose.addEventListener('click', () => els.favoriteDialog.close());
    els.favoriteGrid.addEventListener('click', e => {
      const btn = e.target.closest('button[data-favorite]');
      if (!btn) return;
      setCurrencyOnPickSide(btn.dataset.favorite);
      els.favoriteDialog.close();
    });

    els.rateClose.addEventListener('click', () => els.rateDialog.close());
    els.unitClose.addEventListener('click', () => { closeUnitOpMenu(); els.unitDialog.close(); });
    els.unitOpBtn.addEventListener('click', event => {
      event.stopPropagation();
      const nextOpen = els.unitOpMenu.hidden;
      els.unitOpMenu.hidden = !nextOpen;
      els.unitOpBtn.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
    });
    els.unitOpMenu.addEventListener('click', event => {
      const option = event.target.closest('[data-unit-op]');
      if (!option) return;
      unitOperator = option.dataset.unitOp === '/' ? '/' : '*';
      updateUnitOperatorUI();
      closeUnitOpMenu();
      updateUnitCalculation();
    });
    els.unitDialog.addEventListener('click', event => {
      if (!els.unitOpMenu.hidden && !event.target.closest('.unit-op-wrap')) closeUnitOpMenu();
    });
    els.unitDialog.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !els.unitOpMenu.hidden) {
        event.preventDefault();
        closeUnitOpMenu();
        els.unitOpBtn.focus();
      }
    });
    els.unitCount.addEventListener('input', updateUnitCalculation);
    els.unitApply.addEventListener('click', applyUnitCalculation);
    els.themeRadios.forEach(radio => radio.addEventListener('change', () => {
      if (!radio.checked) return;
      applyTheme(radio.value, { save: true });
      showToast(radio.value === 'system' ? '主題已改為跟隨系統' : radio.value === 'dark' ? '已切換深色模式' : '已切換淺色模式');
    }));

    window.addEventListener('online', () => refreshRates({ quiet: true }));
    window.addEventListener('offline', () => { updateDataStatus(); showToast('已切換離線模式'); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshRates({ quiet: true }); });
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(fitAmountsSoon, 80);
    });
    const colorScheme = window.matchMedia?.('(prefers-color-scheme: dark)');
    colorScheme?.addEventListener?.('change', () => { if (prefs.theme === 'system') applyTheme('system'); });
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(err => console.warn('Service Worker 註冊失敗', err)));
    }
  }

  function init() {
    els.versionText.textContent = `版本 v${APP_VERSION}`;
    applyTheme(prefs.theme);
    buildCurrencyOptions();
    els.fromCurrency.value = prefs.visibleCurrencies.includes(prefs.from) ? prefs.from : prefs.visibleCurrencies[0];
    const fallback = prefs.visibleCurrencies.find(c => c !== els.fromCurrency.value) || prefs.visibleCurrencies[0];
    els.toCurrency.value = prefs.visibleCurrencies.includes(prefs.to) && prefs.to !== els.fromCurrency.value ? prefs.to : fallback;
    renderCurrencyButtons();
    setActiveSide('from');
    updateDataStatus();
    recalc();
    initEvents();
    registerServiceWorker();
    refreshRates({ quiet: true });
    setInterval(() => refreshRates({ quiet: true }), RATE_TTL_MS);
  }

  init();
})();

import YahooFinance from 'yahoo-finance2';

// Yahoo Finance örneği (Anket uyarısını bastırarak)
const yahooFinance = new YahooFinance({
  suppressNotices: ['yahooSurvey'],
});

export async function getStockDetails(symbol) {
  const formattedSymbol = symbol.endsWith('.IS') ? symbol : `${symbol}.IS`;
  const quote = await yahooFinance.quote(formattedSymbol);

  return {
    symbol: quote.symbol.replace('.IS', ''),
    name: quote.longName || quote.shortName || symbol.replace('.IS', ''),
    currency: quote.currency || 'TRY',
    price: quote.regularMarketPrice ?? null,
    change: quote.regularMarketChange ?? null,
    changePercent: quote.regularMarketChangePercent ?? null,
    open: quote.regularMarketOpen ?? null,
    high: quote.regularMarketDayHigh ?? null,
    low: quote.regularMarketDayLow ?? null,
    previousClose: quote.regularMarketPreviousClose ?? null,
    volume: quote.regularMarketVolume ?? null,
    averageVolume: quote.averageDailyVolume3Month ?? null,
    fiftyTwoWeekLow: quote.fiftyTwoWeekLow ?? null,
    fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh ?? null,
    marketCap: quote.marketCap ?? null,
    trailingPE: quote.trailingPE ?? null,
    priceToBook: quote.priceToBook ?? null,
    marketTime: quote.regularMarketTime ?? null,
    delayedByMinutes: quote.exchangeDataDelayedBy ?? null,
  };
}

// ==========================================
// SAF JAVASCRIPT TEKNİK İNDİKATÖR HESAPLAMALARI
// ==========================================

// 1. VWMA (Volume Weighted Moving Average)
function calculateVWMA(candles, period = 21) {
  if (candles.length < period) return [];
  const vwma = [];
  for (let i = period - 1; i < candles.length; i++) {
    const slice = candles.slice(i - period + 1, i + 1);
    const sumPriceVolume = slice.reduce((acc, c) => acc + c.close * (c.volume || 0), 0);
    const sumVolume = slice.reduce((acc, c) => acc + (c.volume || 0), 0);
    vwma.push(sumVolume === 0 ? 0 : sumPriceVolume / sumVolume);
  }
  return vwma;
}

// 2. ALMA (Arnaud Legoux Moving Average)
function calculateALMA(prices, period = 9, sigma = 6, offset = 0.85) {
  if (prices.length < period) return [];
  // pandas_ta.alma uses the offset position as a floating-point value.
  // Rounding it changes the weights (and therefore can change a match).
  const m = offset * (period - 1);
  const s = period / sigma;
  const weights = [];
  let norm = 0;

  for (let i = 0; i < period; i++) {
    const w = Math.exp(-Math.pow(i - m, 2) / (2 * Math.pow(s, 2)));
    weights.push(w);
    norm += w;
  }

  const alma = [];
  for (let i = period - 1; i < prices.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += prices[i - (period - 1 - j)] * weights[j];
    }
    alma.push(sum / norm);
  }
  return alma;
}

// 3. CMF (Chaikin Money Flow)
function calculateCMF(candles, period = 20) {
  if (candles.length < period) return [];
  const cmfValues = [];

  for (let i = period - 1; i < candles.length; i++) {
    const slice = candles.slice(i - period + 1, i + 1);
    let totalMFV = 0;
    let totalVol = 0;

    slice.forEach((c) => {
      const highLowDiff = c.high - c.low;
      const mfm = highLowDiff === 0 ? 0 : ((c.close - c.low) - (c.high - c.close)) / highLowDiff;
      const vol = c.volume || 0;
      totalMFV += mfm * vol;
      totalVol += vol;
    });

    cmfValues.push(totalVol === 0 ? 0 : totalMFV / totalVol);
  }

  return cmfValues;
}

// 4. ADX (Average Directional Index)
function calculateADX(candles, period = 14) {
  if (candles.length < period * 2) return [];

  const trs = [];
  const plusDMs = [];
  const minusDMs = [];

  for (let i = 1; i < candles.length; i++) {
    const curr = candles[i];
    const prev = candles[i - 1];

    const tr = Math.max(
      curr.high - curr.low,
      Math.abs(curr.high - prev.close),
      Math.abs(curr.low - prev.close)
    );
    trs.push(tr);

    const upMove = curr.high - prev.high;
    const downMove = prev.low - curr.low;

    plusDMs.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDMs.push(downMove > upMove && downMove > 0 ? downMove : 0);
  }

  let smoothedTR = trs.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothedPlusDM = plusDMs.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothedMinusDM = minusDMs.slice(0, period).reduce((a, b) => a + b, 0);

  const dxList = [];

  for (let i = period; i < trs.length; i++) {
    smoothedTR = smoothedTR - smoothedTR / period + trs[i];
    smoothedPlusDM = smoothedPlusDM - smoothedPlusDM / period + plusDMs[i];
    smoothedMinusDM = smoothedMinusDM - smoothedMinusDM / period + minusDMs[i];

    const plusDI = (smoothedPlusDM / smoothedTR) * 100;
    const minusDI = (smoothedMinusDM / smoothedTR) * 100;

    const diDiff = Math.abs(plusDI - minusDI);
    const diSum = plusDI + minusDI;
    const dx = diSum === 0 ? 0 : (diDiff / diSum) * 100;

    dxList.push(dx);
  }

  if (dxList.length < period) return [];

  let adx = dxList.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const adxValues = [adx];

  for (let i = period; i < dxList.length; i++) {
    adx = (adx * (period - 1) + dxList[i]) / period;
    adxValues.push(adx);
  }

  return adxValues;
}

// ==========================================
// ANA TARAMA FONKSİYONU
// ==========================================

export async function scanOne(symbol, minAlmaDist = 2.0, maxAlmaDist = 6.0, minVwmaDist = 2.0, maxVwmaDist = 6.0) {
  try {
    const formattedSymbol = symbol.endsWith('.IS') ? symbol : `${symbol}.IS`;

    // Python'daki period="6mo" davranışına karşılık gelecek takvim aralığı.
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);

    const result = await yahooFinance.chart(formattedSymbol, {
      period1: startDate,
      interval: '1d',
    });

    const candles = result?.quotes || [];

    if (!Array.isArray(candles) || candles.length < 40) {
      return { data: null, reason: 'yetersiz_veri' };
    }

    // Null/undefined mum verilerini temizleyelim
    const validCandles = candles.filter(
      (c) => c.open != null && c.high != null && c.low != null && c.close != null
        && c.volume != null && Number.isFinite(c.open) && Number.isFinite(c.high)
        && Number.isFinite(c.low) && Number.isFinite(c.close) && Number.isFinite(c.volume)
    ).map((c) => {
      // yfinance(auto_adjust=True) fiyat serisini temettü/split düzeltmesiyle
      // hesaplar. Yahoo'nun adjclose alanı varsa aynı düzeltmeyi OHLC'ye uygula.
      const adjustment = Number.isFinite(c.adjclose) && c.close !== 0
        ? c.adjclose / c.close
        : 1;
      return {
        ...c,
        open: c.open * adjustment,
        high: c.high * adjustment,
        low: c.low * adjustment,
        close: c.close * adjustment,
      };
    });

    if (validCandles.length < 40) {
      return { data: null, reason: 'yetersiz_veri' };
    }

    const closes = validCandles.map((c) => c.close);

    // İndikatör Hesaplamaları
    const alma9Series = calculateALMA(closes, 9, 6, 0.85);
    const vwma21Series = calculateVWMA(validCandles, 21);
    const cmfSeries = calculateCMF(validCandles, 20);
    const adxSeries = calculateADX(validCandles, 14);

    // Son Bar (Güncel) Verileri
    const lastBar = validCandles.at(-1);
    const lastAlma9 = alma9Series.at(-1);
    const lastVwma21 = vwma21Series.at(-1);
    const lastAdx = adxSeries.length > 0 ? adxSeries.at(-1) : null;
    const lastCmf = cmfSeries.length > 0 ? cmfSeries.at(-1) : null;

    // Mesafeleri Hesapla
    if (!Number.isFinite(lastAlma9) || !Number.isFinite(lastVwma21) || lastAlma9 === 0 || lastVwma21 === 0) {
      return { data: null, reason: 'yetersiz_veri' };
    }

    const almaDist = ((lastBar.close - lastAlma9) / lastAlma9) * 100;
    const vwmaDist = ((lastBar.close - lastVwma21) / lastVwma21) * 100;

    // Kriter Kontrolü
    const isAlmaMatch = almaDist >= minAlmaDist && almaDist <= maxAlmaDist;
    const isVwmaMatch = vwmaDist >= minVwmaDist && vwmaDist <= maxVwmaDist;
    const isBullishCandle = lastBar.close > lastBar.open;

    if (isAlmaMatch && isVwmaMatch && isBullishCandle) {
      return {
        data: {
          Hisse: symbol.replace('.IS', ''),
          Fiyat: Number(lastBar.close.toFixed(2)),
          ALMA9_Mesafe: Number(almaDist.toFixed(2)),
          VWMA21_Mesafe: Number(vwmaDist.toFixed(2)),
          ADX: lastAdx !== null ? Number(lastAdx.toFixed(2)) : null,
          CMF: lastCmf !== null ? Number(lastCmf.toFixed(3)) : null,
        },
        reason: 'uygun',
      };
    }

    return { data: null, reason: 'kritere_uymadi' };
  } catch (error) {
    console.error(`${symbol} taranırken hata:`, error.message);
    return { data: null, reason: 'hata' };
  }
}


export async function scanGainer(symbol, minChangePercent = 9.5) {
  try {
    const details = await getStockDetails(symbol);
    if (Number.isFinite(details.changePercent) && details.changePercent >= minChangePercent) {
      return {
        data: {
          Hisse: details.symbol,
          Fiyat: details.price,
          DegisimYuzde: Number(details.changePercent.toFixed(2)),
        },
        reason: 'uygun',
      };
    }
    return { data: null, reason: 'kritere_uymadi' };
  } catch (error) {
    console.error(`${symbol} kazanc taramasinda hata:`, error.message);
    return { data: null, reason: 'hata' };
  }
}// ==========================================
// V10 STRATEJİSİ: BOĞA FORMASYONLARI
// (Bu bloğu server/services/scanner.js dosyasının EN SONUNA yapıştır)
// ==========================================

function calculateBollingerLowerBand(closes, length = 20, std = 2) {
  const lower = [];
  for (let i = length - 1; i < closes.length; i++) {
    const slice = closes.slice(i - length + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / length;
    const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / length;
    const stdDev = Math.sqrt(variance);
    lower.push(mean - stdDev * std);
  }
  return lower;
}

function calculateMFI(candles, length = 14) {
  const typicalPrices = candles.map((c) => (c.high + c.low + c.close) / 3);
  const moneyFlows = typicalPrices.map((tp, i) => tp * (candles[i].volume || 0));

  const positiveFlow = new Array(candles.length).fill(0);
  const negativeFlow = new Array(candles.length).fill(0);

  for (let i = 1; i < candles.length; i++) {
    if (typicalPrices[i] > typicalPrices[i - 1]) {
      positiveFlow[i] = moneyFlows[i];
    } else {
      negativeFlow[i] = moneyFlows[i];
    }
  }

  const mfi = [];
  for (let i = length; i < candles.length; i++) {
    const posSum = positiveFlow.slice(i - length + 1, i + 1).reduce((a, b) => a + b, 0);
    const negSum = negativeFlow.slice(i - length + 1, i + 1).reduce((a, b) => a + b, 0);
    if (negSum === 0) {
      mfi.push(100);
    } else {
      const moneyRatio = posSum / negSum;
      mfi.push(100 - 100 / (1 + moneyRatio));
    }
  }
  // Dizi hizasını candles ile aynı tutmak için başa null doldur
  return new Array(length).fill(null).concat(mfi);
}

// --- BOĞA MUM FORMASYONLARI (Candlesticker.com) ---

function isBullishEngulfing(prev, curr) {
  return prev.close < prev.open && curr.close > curr.open &&
    curr.open < prev.close && curr.close > prev.open;
}

function isHammer(bar) {
  const body = Math.abs(bar.close - bar.open);
  const lowerShadow = Math.min(bar.close, bar.open) - bar.low;
  const upperShadow = bar.high - Math.max(bar.close, bar.open);
  return lowerShadow > body * 2 && upperShadow < body * 0.5;
}

function isBullishHarami(prev, curr) {
  return prev.close < prev.open && curr.close > curr.open &&
    curr.open > prev.close && curr.close < prev.open;
}

function isCrossHarami(prev, curr) {
  const bodyCurr = Math.abs(curr.close - curr.open);
  const isDoji = bodyCurr <= (curr.high - curr.low) * 0.1;
  return prev.close < prev.open && isDoji &&
    curr.open > prev.close && curr.close < prev.open;
}

function isPiercingLine(prev, curr) {
  const midPrev = (prev.open + prev.close) / 2;
  return prev.close < prev.open && curr.close > curr.open &&
    curr.open < prev.close && curr.close > midPrev;
}

function isMorningStar(c1, c2, c3) {
  return c1.close < c1.open &&
    Math.abs(c2.close - c2.open) < Math.abs(c1.close - c1.open) * 0.3 &&
    c3.close > c3.open && c3.close > (c1.open + c1.close) / 2;
}

function isThreeWhiteSoldiers(c1, c2, c3) {
  return c1.close > c1.open && c2.close > c2.open && c3.close > c3.open &&
    c2.close > c1.close && c3.close > c2.close;
}

function isTweezerBottom(prev, curr) {
  return Math.abs(prev.low - curr.low) / prev.low < 0.005 &&
    prev.close < prev.open && curr.close > curr.open;
}

function isBullishKicker(prev, curr) {
  const prevBody = Math.abs(prev.close - prev.open);
  const currBody = Math.abs(curr.close - curr.open);
  return prev.close < prev.open && curr.close > curr.open &&
    prevBody > (prev.high - prev.low) * 0.9 &&
    currBody > (curr.high - curr.low) * 0.9;
}

function isBeltHold(bar) {
  const body = Math.abs(bar.close - bar.open);
  return bar.open === bar.low && bar.close > bar.open &&
    body > (bar.high - bar.low) * 0.7;
}

function checkBullishPattern(candles, i) {
  if (i < 1) return { found: false, name: null };
  const prev = candles[i - 1];
  const curr = candles[i];

  if (isBullishEngulfing(prev, curr)) return { found: true, name: 'Yutan Boğa' };
  if (isHammer(curr)) return { found: true, name: 'Çekiç Boğa' };
  if (isBullishHarami(prev, curr)) return { found: true, name: 'Hamile Boğa' };
  if (isCrossHarami(prev, curr)) return { found: true, name: 'Kros Hamile Boğa' };
  if (isPiercingLine(prev, curr)) return { found: true, name: 'Delen Mumlar Boğa' };
  if (isTweezerBottom(prev, curr)) return { found: true, name: 'Değen Mumlar Boğa' };
  if (isBullishKicker(prev, curr)) return { found: true, name: 'Tepen Mumlar Boğa' };
  if (isBeltHold(curr)) return { found: true, name: 'Belden Tutma Boğa' };

  if (i >= 2) {
    const c1 = candles[i - 2];
    if (isMorningStar(c1, prev, curr)) return { found: true, name: 'Sabah Yıldızı Boğa' };
    if (isThreeWhiteSoldiers(c1, prev, curr)) return { found: true, name: 'Üç Beyaz Asker Boğa' };
  }

  return { found: false, name: null };
}

// --- V10 GİRİŞ KOŞULU ---
// i-3: BB alt bandına değmiş mum, i-2: kırmızı mum, i-1: 1. yeşil mum,
// i: 2. gün -> boğa formasyonu + kapanış >= 1. yeşil kapanış * 1.02

function checkV10EntrySignal(candles, lowerBand, i) {
  if (i < 3) return { ok: false };

  const bbTouch = candles[i - 3];
  const lowerAtTouch = lowerBand[i - 3];
  const redCandle = candles[i - 2];
  const green1 = candles[i - 1];
  const current = candles[i];

  if (lowerAtTouch == null) return { ok: false };

  const condBbTouch = bbTouch.low <= lowerAtTouch;
  const condRed = redCandle.close < redCandle.open;
  const condGreen1 = green1.close > green1.open;

  const { found: patternFound, name: patternName } = checkBullishPattern(candles, i);

  const hedefGiris = green1.close * 1.02;
  const condGiris = current.close >= hedefGiris;

  const allOk = condBbTouch && condRed && condGreen1 && patternFound && condGiris;

  return {
    ok: allOk,
    girisFiyat: current.close,
    patternName,
  };
}

// --- ANA V10 TARAMA FONKSİYONU ---
// NOT: calculateVWMA fonksiyonu bu dosyada zaten tanımlı, tekrar yazmadık.

const V10_MFI_ESIK = 40;
const V10_VWMA_PERIYOD = 21;

export async function scanOneV10(symbol) {
  try {
    const formattedSymbol = symbol.endsWith('.IS') ? symbol : `${symbol}.IS`;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);

    const result = await yahooFinance.chart(formattedSymbol, {
      period1: startDate,
      interval: '1d',
    });

    const rawCandles = result?.quotes || [];
    if (!Array.isArray(rawCandles) || rawCandles.length < 30) {
      return { data: null, reason: 'yetersiz_veri' };
    }

    const validCandles = rawCandles.filter(
      (c) => c.open != null && c.high != null && c.low != null && c.close != null &&
        c.volume != null && Number.isFinite(c.open) && Number.isFinite(c.high) &&
        Number.isFinite(c.low) && Number.isFinite(c.close) && Number.isFinite(c.volume)
    ).map((c) => {
      const adjustment = Number.isFinite(c.adjclose) && c.close !== 0
        ? c.adjclose / c.close
        : 1;
      return {
        ...c,
        open: c.open * adjustment,
        high: c.high * adjustment,
        low: c.low * adjustment,
        close: c.close * adjustment,
      };
    });

    if (validCandles.length < 30) {
      return { data: null, reason: 'yetersiz_veri' };
    }

    const closes = validCandles.map((c) => c.close);
    const lowerBandRaw = calculateBollingerLowerBand(closes, 20, 2);
    const alignedLowerBand = new Array(19).fill(null).concat(lowerBandRaw);

    const mfiSeries = calculateMFI(validCandles, 14);
    const vwmaSeriesRaw = calculateVWMA(validCandles, V10_VWMA_PERIYOD);
    const alignedVwma = new Array(V10_VWMA_PERIYOD - 1).fill(null).concat(vwmaSeriesRaw);

    const lastIdx = validCandles.length - 1;
    const lastMfi = mfiSeries[lastIdx];
    const prevMfi = mfiSeries[lastIdx - 1];

    if (lastMfi == null || prevMfi == null) {
      return { data: null, reason: 'yetersiz_veri' };
    }

    const signal = checkV10EntrySignal(validCandles, alignedLowerBand, lastIdx);

    const condMfi = lastMfi > V10_MFI_ESIK;
    const condMfiArtiyor = lastMfi > prevMfi;

    if (signal.ok && condMfi && condMfiArtiyor) {
      const vwmaDeger = alignedVwma[lastIdx];
      const karAlVwma = vwmaDeger != null ? vwmaDeger * 1.05 : null;
      const karAlMin = signal.girisFiyat * 1.03;
      const karAlSeviye = karAlVwma != null ? Math.max(karAlVwma, karAlMin) : karAlMin;
      const stopLossSeviye = signal.girisFiyat * 0.97;

      return {
        data: {
          Hisse: symbol.replace('.IS', ''),
          Formasyon: signal.patternName,
          Giris: Number(signal.girisFiyat.toFixed(2)),
          MFI: Number(lastMfi.toFixed(2)),
          KarAl: Number(karAlSeviye.toFixed(2)),
          StopLoss: Number(stopLossSeviye.toFixed(2)),
        },
        reason: 'uygun',
      };
    }

    return { data: null, reason: 'kritere_uymadi' };
  } catch (error) {
    console.error(`${symbol} V10 taranırken hata:`, error.message);
    return { data: null, reason: 'hata' };
  }
}

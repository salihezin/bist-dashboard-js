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

export async function scanOne(symbol) {
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
    const lastBar = validCandles[validCandles.length - 1];
    const lastAlma9 = alma9Series[alma9Series.length - 1];
    const lastVwma21 = vwma21Series[vwma21Series.length - 1];
    const lastAdx = adxSeries.length > 0 ? adxSeries[adxSeries.length - 1] : null;
    const lastCmf = cmfSeries.length > 0 ? cmfSeries[cmfSeries.length - 1] : null;

    // Mesafeleri Hesapla
    if (!Number.isFinite(lastAlma9) || !Number.isFinite(lastVwma21) || lastAlma9 === 0 || lastVwma21 === 0) {
      return { data: null, reason: 'yetersiz_veri' };
    }

    const almaDist = ((lastBar.close - lastAlma9) / lastAlma9) * 100;
    const vwmaDist = ((lastBar.close - lastVwma21) / lastVwma21) * 100;

    // Kriter Kontrolü
    const isAlmaMatch = almaDist >= 2.0 && almaDist <= 6.0;
    const isVwmaMatch = vwmaDist >= 2.0 && vwmaDist <= 6.0;
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
}
import express from 'express';
import yahooFinance from 'yahoo-finance2'; // <-- 1. EKSİK IMPORT EKLENDİ
import { supabase } from '../config/supabase.js';

const router = express.Router();

// --- TEKNİK İNDİKATÖR YARDIMCI FONKSİYONLARI ---

function calculateALMA(prices, length = 9, sigma = 6, offset = 0.85) {
  if (!prices || prices.length < length) return null;
  const m = Math.floor(offset * (length - 1));
  const s = length / sigma;
  let norm = 0;
  let sum = 0;

  for (let i = 0; i < length; i++) {
    const weight = Math.exp(-Math.pow(i - m, 2) / (2 * Math.pow(s, 2)));
    norm += weight;
    sum += prices[prices.length - length + i] * weight;
  }
  return sum / norm;
}

function calculateVWMA(closes, volumes, length = 21) {
  if (!closes || closes.length < length) return null;
  let pvSum = 0;
  let vSum = 0;

  for (let i = closes.length - length; i < closes.length; i++) {
    pvSum += closes[i] * volumes[i];
    vSum += volumes[i];
  }
  return vSum === 0 ? null : pvSum / vSum;
}

function calculateCMF(highs, lows, closes, volumes, length = 20) {
  if (!closes || closes.length < length) return null;
  let mfvSum = 0;
  let vSum = 0;

  for (let i = closes.length - length; i < closes.length; i++) {
    const h = highs[i];
    const l = lows[i];
    const c = closes[i];
    const v = volumes[i];

    const mfm = h === l ? 0 : ((c - l) - (h - c)) / (h - l);
    mfvSum += mfm * v;
    vSum += v;
  }
  return vSum === 0 ? null : mfvSum / vSum;
}

function calculateADX(highs, lows, closes, length = 14) {
  if (!closes || closes.length < length * 2) return null;
  let trs = [], pdms = [], ndms = [];

  for (let i = 1; i < closes.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];

    const pdm = (upMove > downMove && upMove > 0) ? upMove : 0;
    const ndm = (downMove > upMove && downMove > 0) ? downMove : 0;

    trs.push(tr);
    pdms.push(pdm);
    ndms.push(ndm);
  }

  let trSmooth = trs.slice(0, length).reduce((a, b) => a + b, 0);
  let pdmSmooth = pdms.slice(0, length).reduce((a, b) => a + b, 0);
  let ndmSmooth = ndms.slice(0, length).reduce((a, b) => a + b, 0);

  let dxArray = [];

  for (let i = length; i < trs.length; i++) {
    trSmooth = trSmooth - (trSmooth / length) + trs[i];
    pdmSmooth = pdmSmooth - (pdmSmooth / length) + pdms[i];
    ndmSmooth = ndmSmooth - (ndmSmooth / length) + ndms[i];

    const pdi = (pdmSmooth / trSmooth) * 100;
    const ndi = (ndmSmooth / trSmooth) * 100;
    const dx = (pdi + ndi === 0) ? 0 : (Math.abs(pdi - ndi) / (pdi + ndi)) * 100;
    dxArray.push(dx);
  }

  if (dxArray.length < length) return null;
  return dxArray.slice(-length).reduce((a, b) => a + b, 0) / length;
}

async function scanOneStock(symbol) {
  try {
    const ticker = symbol.endsWith('.IS') ? symbol : `${symbol}.IS`;
    
    // Son 6 ayı hesaplama
    const today = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(today.getMonth() - 6);

    // historical verisi çekme
    const quotesRaw = await yahooFinance.historical(ticker, {
      period1: sixMonthsAgo.toISOString().split('T')[0],
      period2: today.toISOString().split('T')[0],
      interval: '1d'
    });

    if (!quotesRaw || quotesRaw.length < 40) return null;

    const quotes = quotesRaw.filter(q => q.close != null && q.volume != null && q.open != null);
    if (quotes.length < 40) return null;

    const closes = quotes.map(q => q.close);
    const highs = quotes.map(q => q.high);
    const lows = quotes.map(q => q.low);
    const opens = quotes.map(q => q.open);
    const volumes = quotes.map(q => q.volume);

    const lastClose = closes[closes.length - 1];
    const lastOpen = opens[opens.length - 1];

    const alma = calculateALMA(closes, 9, 6, 0.85);
    const vwma = calculateVWMA(closes, volumes, 21);
    const cmf = calculateCMF(highs, lows, closes, volumes, 20);
    const adx = calculateADX(highs, lows, closes, 14);

    if (!alma || !vwma) return null;

    const almaDist = ((lastClose - alma) / alma) * 100;
    const vwmaDist = ((lastClose - vwma) / vwma) * 100;

    // FİLTRE KRİTERİ
    if (almaDist >= 2.0 && almaDist <= 6.0 && vwmaDist >= 2.0 && vwmaDist <= 6.0 && lastClose > lastOpen) {
      return {
        symbol: symbol.replace('.IS', ''),
        price: Number(lastClose.toFixed(2)),
        alma_dist: Number(almaDist.toFixed(2)),
        vwma_dist: Number(vwmaDist.toFixed(2)),
        adx: adx ? Number(adx.toFixed(2)) : 0,
        cmf: cmf ? Number(cmf.toFixed(3)) : 0
      };
    }

    return null;
  } catch (err) {
    console.error(`${symbol} taranırken hata oluştu:`, err.message);
    return null;
  }
}

// --- ROUTER ENDPOINTLERİ ---

router.get('/tickers', async (req, res) => {
  try {
    const { data, error } = await supabase.from('tickers').select('*').order('symbol', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/tickers', async (req, res) => {
  try {
    const { symbol } = req.body;
    const upperSymbol = symbol.toUpperCase().trim();
    const { data, error } = await supabase.from('tickers').insert([{ symbol: upperSymbol }]).select();
    if (error) return res.status(400).json({ error: error.message });
    return res.json(data[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/tickers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('tickers').delete().eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ message: 'Hisse silindi' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/latest-results', async (req, res) => {
  try {
    const { data: latestLog, error: logError } = await supabase
      .from('scan_logs')
      .select('*')
      .order('scanned_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (logError) return res.status(500).json({ error: logError.message });
    if (!latestLog) return res.json({ log: null, results: [] });

    const { data: results, error: resultsError } = await supabase
      .from('scan_results')
      .select('*')
      .eq('scan_id', latestLog.id);

    if (resultsError) return res.status(500).json({ error: resultsError.message });

    return res.json({ log: latestLog, results: results || [] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/scan-all', async (req, res) => {
  try {
    const { user_id, userId: bodyUserId } = req.body || {};
    const userId = user_id || bodyUserId || null;

    const { data: tickersData, error: tickerError } = await supabase
      .from('tickers')
      .select('symbol');

    if (tickerError) throw tickerError;

    const matchedStocks = [];

    // Taramayı seri döngüyle çalıştırıyoruz
    for (const item of tickersData) {
      const match = await scanOneStock(item.symbol);
      if (match) {
        matchedStocks.push(match);
      }
    }

    // 1. Log kaydı
    const logPayload = { scanned_at: new Date().toISOString() };
    if (userId) logPayload.user_id = userId;

    const { data: logData, error: logErr } = await supabase
      .from('scan_logs')
      .insert([logPayload])
      .select()
      .single();

    if (logErr) throw logErr;

    // 2. Eşleşen sonuçları kaydet
    if (matchedStocks.length > 0) {
      const recordsToInsert = matchedStocks.map((stock) => ({
        scan_id: logData.id,
        symbol: stock.symbol,
        price: stock.price,
        alma_dist: stock.alma_dist,
        vwma_dist: stock.vwma_dist,
        adx: stock.adx,
        cmf: stock.cmf
      }));

      const { error: insertErr } = await supabase
        .from('scan_results')
        .insert(recordsToInsert);

      if (insertErr) throw insertErr;
    }

    return res.json({ log: logData, results: matchedStocks });

  } catch (err) {
    console.error('Scan-all hatası:', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
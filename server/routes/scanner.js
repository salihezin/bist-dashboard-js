import express from 'express';
import { supabase } from '../config/supabase.js';
import { getStockDetails, scanOne, scanGainer, scanOneV10, getStockChartData } from '../services/scanner.js';

const router = express.Router();
const SCAN_CONCURRENCY = 5;

async function scanTickers(tickers, minAlmaDist = 2.0, maxAlmaDist = 6.0, minVwmaDist = 2.0, maxVwmaDist = 6.0) {
  const matches = [];
  let nextIndex = 0;

  async function worker(minAlmaDist, maxAlmaDist, minVwmaDist, maxVwmaDist) {
    while (nextIndex < tickers.length) {
      const ticker = tickers[nextIndex++];
      const { data: match } = await scanOne(ticker.symbol, minAlmaDist, maxAlmaDist, minVwmaDist, maxVwmaDist);
      if (match) {
        let hasNegativeChange = false;

        try {
          const details = await getStockDetails(match.Hisse);
          hasNegativeChange = Number.isFinite(details?.change) && details.change < 0;
        } catch (detailErr) {
          console.error(`${match.Hisse} detay filtresi alınamadı:`, detailErr.message);
        }

        if (hasNegativeChange) {
          continue;
        }

        matches.push({
          symbol: match.Hisse,
          price: match.Fiyat,
          alma_dist: match.ALMA9_Mesafe,
          vwma_dist: match.VWMA21_Mesafe,
          adx: match.ADX,
          cmf: match.CMF,
        });
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(SCAN_CONCURRENCY, tickers.length) }, () => worker(minAlmaDist, maxAlmaDist, minVwmaDist, maxVwmaDist))
  );
  return matches;
}

async function scanGainers(tickers, minChangePercent = 9.5) {
  const matches = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < tickers.length) {
      const ticker = tickers[nextIndex++];
      const { data: match } = await scanGainer(ticker.symbol, minChangePercent);
      if (match) matches.push(match);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(SCAN_CONCURRENCY, tickers.length) }, worker)
  );

  matches.sort((a, b) => b.DegisimYuzde - a.DegisimYuzde);
  return matches;
}

async function scanTickersV10(tickers) {
  const matches = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < tickers.length) {
      const ticker = tickers[nextIndex++];
      const { data: match } = await scanOneV10(ticker.symbol);
      if (match) matches.push(match);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(SCAN_CONCURRENCY, tickers.length) }, worker)
  );
  return matches;
}

router.get('/gainers', async (req, res) => {
  try {
    const minPct = Number(req.query.min) || 9.5;
    const { data: tickersData, error } = await supabase.from('tickers').select('symbol');
    if (error) throw error;

    const gainers = await scanGainers(tickersData, minPct);
    return res.json({ threshold: minPct, count: gainers.length, results: gainers });
  } catch (err) {
    console.error('Gainers hatasi:', err);
    return res.status(500).json({ error: err.message });
  }
});

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

router.get('/stocks/:symbol', async (req, res) => {
  try {
    const details = await getStockDetails(req.params.symbol.toUpperCase().trim());
    return res.json(details);
  } catch (err) {
    console.error('Hisse detayı alınamadı:', err.message);
    return res.status(502).json({ error: 'Hisse detayları şu anda alınamadı.' });
  }
});

// Hisse grafiği: mumlar + Bollinger Bandı + MFI
router.get('/stocks/:symbol/chart', async (req, res) => {
  try {
    const data = await getStockChartData(req.params.symbol.toUpperCase().trim());
    return res.json(data);
  } catch (err) {
    console.error('Grafik verisi alınamadı:', err.message);
    return res.status(502).json({ error: 'Grafik verileri şu anda alınamadı.' });
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
    const {
      user_id,
      userId: bodyUserId,
      minAlmaDist: bodyMinAlmaDist,
      maxAlmaDist: bodyMaxAlmaDist,
      minVwmaDist: bodyMinVwmaDist,
      maxVwmaDist: bodyMaxVwmaDist
    } = req.body || {};
    const userId = user_id || bodyUserId || null;
    const minAlmaDist = bodyMinAlmaDist ?? 2.0;
    const maxAlmaDist = bodyMaxAlmaDist ?? 6.0;
    const minVwmaDist = bodyMinVwmaDist ?? 2.0;
    const maxVwmaDist = bodyMaxVwmaDist ?? 6.0;

    const { data: tickersData, error: tickerError } = await supabase
      .from('tickers')
      .select('symbol');

    if (tickerError) throw tickerError;

    const matchedStocks = await scanTickers(tickersData, minAlmaDist, maxAlmaDist, minVwmaDist, maxVwmaDist);

    const logPayload = { scanned_at: new Date().toISOString() };
    if (userId) logPayload.user_id = userId;

    const { data: logData, error: logErr } = await supabase
      .from('scan_logs')
      .insert([logPayload])
      .select()
      .single();

    if (logErr) throw logErr;

    const { error: deleteErr } = await supabase
      .from('scan_results')
      .delete()
      .not('id', 'is', null);

    if (deleteErr) throw deleteErr;

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

router.post('/scan-v10', async (req, res) => {
  try {
    const { data: tickersData, error } = await supabase.from('tickers').select('symbol');
    if (error) throw error;

    const matches = await scanTickersV10(tickersData);
    return res.json({ count: matches.length, results: matches });
  } catch (err) {
    console.error('V10 scan hatasi:', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;

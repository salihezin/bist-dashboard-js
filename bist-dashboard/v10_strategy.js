import yahooFinance from 'yahoo-finance2';

// İndikatör fonksiyonları (örnek)
function calculateVWMA(candles, period = 21) {
  if (candles.length < period) return [];
  const vwma = [];
  for (let i = period - 1; i < candles.length; i++) {
    const slice = candles.slice(i - period + 1, i + 1);
    const sumPV = slice.reduce((acc, c) => acc + c.close * c.volume, 0);
    const sumV = slice.reduce((acc, c) => acc + c.volume, 0);
    vwma.push(sumV === 0 ? 0 : sumPV / sumV);
  }
  return vwma;
}

// Örnek formasyon kontrolü (Yutan Boğa)
function checkBullishEngulfing(prev, curr) {
  return (
    prev.close < prev.open &&
    curr.close > curr.open &&
    curr.open < prev.close &&
    curr.close > prev.open
  );
}

// Ana tarama fonksiyonu
export async function runV10Scan(symbol) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 6);

  const result = await yahooFinance.chart(symbol, {
    period1: startDate,
    interval: '1d',
  });

  const candles = result.quotes.map(c => ({
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume
  }));

  if (candles.length < 30) return { signal: null, reason: "yetersiz veri" };

  const lastIndex = candles.length - 1;
  const prev = candles[lastIndex - 1];
  const curr = candles[lastIndex];

  if (checkBullishEngulfing(prev, curr)) {
    return { signal: { symbol, fiyat: curr.close, formasyon: "Yutan Boğa" }, reason: "uygun" };
  }

  return { signal: null, reason: "kritere uymadı" };
}

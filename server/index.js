import express from 'express';
import cors from 'cors';
import BorsaAPI from 'borsa-api';
import { scanOne } from './services/scanner.js';
import dotenv from 'dotenv';
import scannerRouter from './routes/scanner.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const api = new BorsaAPI();

// Frontend (Vite) isteklerine izin veriyoruz
app.use(cors());
app.use(express.json());

// Supabase & Tarama Rotaları
app.use('/api', scannerRouter);

// Tekli veya toplu tarama endpoint'i
app.get('/api/scan/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const result = await scanOne(symbol);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endlekse (Örn: XU100) erişim endpoint'i
app.get('/api/index/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const data = await api.getIndex(symbol);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Tüm endeksler
app.get('/api/get_all_indexes', async (req, res) => {
    try {
        const data = await api.getAllIndexes();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Hisse senedi verisi al
app.get('/api/stock/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const data = await api.getStock(symbol);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Popüler hisseler
app.get('/api/popular', async (req, res) => {
  try {
    const data = await api.getPopularStocks();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Hisse arama
app.get('/api/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const data = await api.searchStock(query);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Historik veri
app.get('/api/historical/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { period, interval } = req.query; // Örn: ?period=1mo&interval=1d
    const data = await api.getHistoricalData(symbol, { period, interval });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Detaylı hisse bilgisi
app.get('/api/details/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const data = await api.getStockDetails(symbol);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// İki hisseyi karşılaştır
app.get('/api/compare/:symbol1/:symbol2', async (req, res) => {
  try {
    const { symbol1, symbol2 } = req.params;
    const data = await api.compareStocks(symbol1, symbol2);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// En çok yükselenler
app.get('/api/top_gainers/:count', async (req, res) => {
  try {
    const { count } = req.params;
    const data = await api.getTopGainers(parseInt(count));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// En çok düşenler
app.get('/api/top_losers/:count', async (req, res) => {
  try {
    const { count } = req.params;
    const data = await api.getTopLosers(parseInt(count));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// En yüksek hacimli hisseler
app.get('/api/top_volume/:count', async (req, res) => {
  try {
    const { count } = req.params;
    const data = await api.getTopVolume(parseInt(count));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Watchlist işlemleri
app.post('/api/watchlist/add', (req, res) => {
  try {
    const { symbol, name } = req.body;
    api.watchlist.addToWatchlist(symbol, name);
    res.json({ message: 'Hisse watchlist\'e eklendi' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/watchlist', (req, res) => {
  try {
    const watchlist = api.watchlist.getWatchlist();
    res.json(watchlist);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/watchlist/data', async (req, res) => {
  try {
    const data = await api.getWatchlistData();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



app.listen(PORT, () => {
  console.log(`Backend sunucusu http://localhost:${PORT} üzerinde çalışıyor`);
});


/*
// Endeks verisi al
async function getIndex() {
  try {
    const xu100 = await api.getIndex('XU100');
    console.log(xu100);
    // {
    //   symbol: 'XU100',
    //   name: 'BIST 100',
    //   value: 9234.56,
    //   change: 123.45,
    //   changePercent: 1.35,
    //   high: 9250.00,
    //   low: 9100.00,
    //   volume: 12345678,
    //   timestamp: '2024-11-16T...'
    // }
  } catch (error) {
    console.error(error.message);
  }
}

// Hisse senedi verisi al
async function getStock() {
  try {
    const thyao = await api.getStock('THYAO');
    console.log(thyao);
    // {
    //   symbol: 'THYAO',
    //   name: 'TURK HAVA YOLLARI',
    //   price: 234.50,
    //   change: 5.25,
    //   changePercent: 2.29,
    //   high: 236.00,
    //   low: 230.00,
    //   open: 231.00,
    //   close: 229.25,
    //   volume: 1234567,
    //   timestamp: '2024-11-16T...'
    // }
  } catch (error) {
    console.error(error.message);
  }
}

// Popüler hisseler
async function getPopular() {
  const stocks = await api.getPopularStocks();
  console.log(stocks);
}

// Tüm endeksler
async function getAllIndexes() {
  const indexes = await api.getAllIndexes();
  console.log(indexes);
}

// Hisse arama
async function search() {
  const results = await api.searchStock('garanti');
  console.log(results);
}

// Historik veri
async function getHistorical() {
  const data = await api.getHistoricalData('THYAO', {
    period: '1mo',  // 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max
    interval: '1d'  // 1d, 1wk, 1mo
  });
  console.log(data);
  // {
  //   meta: {
  //     currency: 'TRY',
  //     symbol: 'THYAO',
  //     longName: 'Türk Hava Yollari...',
  //     fiftyTwoWeekHigh: 346.25,
  //     fiftyTwoWeekLow: 249.20,
  //     ...
  //   },
  //   quotes: [
  //     {
  //       date: Date,
  //       open: 273.00,
  //       high: 274.75,
  //       low: 271.50,
  //       close: 273.00,
  //       adjClose: 266.68,
  //       volume: 19991989
  //     },
  //     ...
  //   ]
  // }
}

// Detaylı hisse bilgisi
async function getDetails() {
  const details = await api.getStockDetails('THYAO');
  console.log(details);
  // {
  //   ...StockData,
  //   marketCap: 123456789000,
  //   peRatio: 15.23,
  //   eps: 12.34,
  //   dividendYield: 0.025,
  //   fiftyTwoWeekHigh: 346.25,
  //   fiftyTwoWeekLow: 249.20,
  //   averageVolume: 25000000,
  //   beta: 1.15,
  //   sector: 'Industrials',
  //   industry: 'Airlines',
  //   description: 'Company description...'
  // }
}

// İki hisseyi karşılaştır
async function compare() {
  const comparison = await api.compareStocks('THYAO', 'GARAN');
  console.log(comparison);
}

// En çok yükselenler
async function topGainers() {
  const gainers = await api.getTopGainers(5);
  console.log(gainers);
}

// En çok düşenler
async function topLosers() {
  const losers = await api.getTopLosers(5);
  console.log(losers);
}

// En yüksek hacimli hisseler
async function topVolume() {
  const volume = await api.getTopVolume(5);
  console.log(volume);
}

// Watchlist işlemleri
api.watchlist.addToWatchlist('THYAO', 'Türk Hava Yolları');
api.watchlist.addToWatchlist('GARAN', 'Garanti Bankası');

const watchlist = api.watchlist.getWatchlist();
console.log(watchlist);

// Watchlist verilerini getir
async function getWatchlistData() {
  const stocks = await api.getWatchlistData();
  console.log(stocks);
}
*/
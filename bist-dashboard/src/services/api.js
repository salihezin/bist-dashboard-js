import axios from 'axios';

const API_BASE = 'https://bist-dashboard-js-lyph.vercel.app/api';

// En Son Kaydedilen Tarama Sonuçlarını ve Log Bilgisini Getir
export async function getLatestResults() {
  const response = await axios.get(`${API_BASE}/latest-results`);
  return response.data;
}

// Yeni tarama başlatır.
export async function runScanAll(userId, minAlmaDist, maxAlmaDist, minVwmaDist, maxVwmaDist) {
  const response = await axios.post(`${API_BASE}/scan-all`, { userId, minAlmaDist, maxAlmaDist, minVwmaDist, maxVwmaDist });
  return response.data;
}

// Tickers (Hisseler) Listesini Getir
export async function getTickers() {
  const response = await axios.get(`${API_BASE}/tickers`);
  return response.data;
}

// Yeni Hisse Ekle
export async function addTicker(symbol) {
  const response = await axios.post(`${API_BASE}/tickers`, { symbol });
  return response.data;
}

// Hisse Sil
export async function deleteTicker(id) {
  const response = await axios.delete(`${API_BASE}/tickers/${id}`);
  return response.data;
}

export async function getStockDetails(symbol) {
  const response = await axios.get(`${API_BASE}/stocks/${encodeURIComponent(symbol)}`);
  return response.data;
}

export async function getGainers(minPercent = 9.5) {
  const { data } = await axios.get(`${API_BASE}/gainers`, { params: { min: minPercent } });
  return data;
}
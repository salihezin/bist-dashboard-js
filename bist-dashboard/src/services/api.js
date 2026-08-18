import axios from 'axios';
import { supabase } from '../supabaseClient';

const API_BASE = 'http://localhost:3001/api';

// En Son Kaydedilen Tarama Sonuçlarını ve Log Bilgisini Getir
export async function getLatestResults() {
  const response = await axios.get(`${API_BASE}/latest-results`);
  return response.data;
}

// Yeni Tarama Başlat (Günde max 3 limitli)
export async function runScanAll(userId) {
  const response = await axios.post(`${API_BASE}/scan-all`, { userId });
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
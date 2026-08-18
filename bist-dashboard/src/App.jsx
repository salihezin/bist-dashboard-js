import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import {
  getLatestResults,
  runScanAll,
  getTickers,
  addTicker,
  deleteTicker
} from './services/api';

import StockListTable from './components/StockListTable';

import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  AppBar,
  Toolbar,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  Tooltip,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Alert
} from '@mui/material';

import RefreshIcon from '@mui/icons-material/Refresh';
import LogoutIcon from '@mui/icons-material/Logout';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import ListAltIcon from '@mui/icons-material/ListAlt';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

export default function App() {
  // Auth State
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  // Data State
  const [scannedResults, setScannedResults] = useState([]);
  const [scanLog, setScanLog] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Tickers Management State
  const [tickers, setTickers] = useState([]);
  const [openTickerDialog, setOpenTickerDialog] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');

  // 1. Supabase Session Dinleyicisi
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Veritabanından (snake_case) gelen veriyi Tablonun anladığı formata dönüştüren yardımcı fonksiyon:
const formatStockData = (dataList) => {
  if (!Array.isArray(dataList)) return [];
  return dataList.map((item) => ({
    Hisse: item.symbol || item.Hisse || '',
    Fiyat: item.price ?? item.Fiyat ?? 0,
    ALMA9_Mesafe: item.alma_dist ?? item.ALMA9_Mesafe ?? 0,
    VWMA21_Mesafe: item.vwma_dist ?? item.VWMA21_Mesafe ?? 0,
    ADX: item.adx ?? item.ADX ?? 0,
    CMF: item.cmf ?? item.CMF ?? 0
  }));
};

// 1. Sayfa Açıldığında / F5 Atıldığında Çalışan Fonksiyon
const fetchLatestResults = async () => {
  try {
    const res = await fetch('http://localhost:3001/api/latest-results'); // Portunuz farklıysa güncelleyin (örn: 3000 veya 5000)
    const data = await res.json();
    
    console.log('Backend Raw Results:', data.results);

    if (data && data.results) {
      const formatted = formatStockData(data.results);
      console.log('Formatted Results:', formatted);
      
      // State'lerinizi güncelleyin (Kendi state isimlerinize göre ayarlayın):
      setScannedResults(formatted);
      if (data.log) {
        setScanLog(data.log);
      }
    }
  } catch (err) {
    console.error('Sonuçlar alınamadı:', err);
  }
};

// 2. "YENİ TARAMA" Butonuna Basılınca Çalışan Fonksiyon
const handleScan = async () => {
  try {
    setIsScanning(true);
    const res = await fetch('http://localhost:3001/api/scan-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: session.user?.id || null })
    });
    
    const data = await res.json();
    
    if (data && data.results) {
      const formatted = formatStockData(data.results);
      console.log('Formatted Results after Scan:', formatted);
      setScannedResults(formatted);
      if (data.log) {
        setScanLog(data.log);
      }
    }
  } catch (err) {
    console.error('Tarama hatası:', err);
  } finally {
    setIsScanning(false);
  }
};

  // 2. Oturum Açılınca Son Verileri ve Hisse Havuzunu Yükle
  useEffect(() => {
    if (session) {
      fetchLatestResults();
      fetchTickers();
    }
  }, [session]);

  const loadLatestData = async () => {
  try {
    const data = await getLatestResults();
    
    if (data && Array.isArray(data.results)) {
      console.log('Backend Raw Results:', data.results);
      setScanLog(data.log || null);

      const formatted = data.results.map((r) => ({
        Hisse: r.symbol || r.Hisse || r.ticker || '',
        Fiyat: r.price ?? r.Fiyat ?? 0,
        ALMA9_Mesafe: r.alma_dist ?? r.alma9_distance ?? r.alma_distance ?? r.ALMA9_Mesafe ?? 0,
        VWMA21_Mesafe: r.vwma_dist ?? r.vwma21_distance ?? r.vwma_distance ?? r.VWMA21_Mesafe ?? 0,
        ADX: r.adx ?? r.ADX ?? 0,
        CMF: r.cmf ?? r.CMF ?? 0
      }));

      console.log('Formatted Results:', formatted);
      setScannedResults(formatted);
    }
  } catch (err) {
    console.error('Veri yüklenirken hata:', err);
  }
};

  const fetchTickers = async () => {
    try {
      const data = await getTickers();
      setTickers(data || []);
    } catch (err) {
      console.error('Hisseler yüklenirken hata:', err);
    }
  };

  // Auth İşlemleri
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Kayıt başarılı! Giriş yapabilirsiniz.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Yeni Tarama Tetikleme (Backend Limit Kontrollü)
  const handleStartScan = async () => {
    setIsScanning(true);
    setErrorMessage('');
    try {
      const res = await runScanAll(session.user.id);
      setScanLog(res.log);
      const formatted = (res.results || []).map((r) => ({
        Hisse: r.Hisse,
        Fiyat: r.Fiyat,
        ALMA9_Mesafe: r.ALMA9_Mesafe,
        VWMA21_Mesafe: r.VWMA21_Mesafe,
        ADX: r.ADX,
        CMF: r.CMF
      }));
      setScannedResults(formatted);
    } catch (err) {
      const msg = err.response?.data?.error || 'Tarama başlatılamadı.';
      setErrorMessage(msg);
    } finally {
      setIsScanning(false);
    }
  };

  // Hisse Ekleme / Silme
  const handleAddTicker = async () => {
    if (!newSymbol.trim()) return;
    try {
      await addTicker(newSymbol);
      setNewSymbol('');
      fetchTickers();
    } catch (err) {
      alert('Hisse eklenirken hata: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteTicker = async (id) => {
    try {
      await deleteTicker(id);
      fetchTickers();
    } catch (err) {
      alert('Hisse silinirken hata oluştu.');
    }
  };

  // -------------------------------------------------------------
  // GİRİŞ / KAYIT EKRANI
  // -------------------------------------------------------------
  if (!session) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a',
          px: 2
        }}
      >
        <Paper
          elevation={6}
          sx={{
            p: 4,
            width: '100%',
            maxWidth: 400,
            borderRadius: 3,
            backgroundColor: '#1e293b',
            color: '#f8fafc',
            textAlign: 'center'
          }}
        >
          <Box
            sx={{
              width: 50,
              height: 50,
              borderRadius: '50%',
              backgroundColor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}
          >
            <LockOutlinedIcon sx={{ color: '#fff', fontSize: 28 }} />
          </Box>
          <Typography component="h1" variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            BIST Dashboard
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8', mb: 3 }}>
            {isSignUp ? 'Yeni hesap oluşturun (v1.0.0)' : 'Supabase hesabınızla giriş yapın (v1.0.0)'}
          </Typography>

          <Box component="form" onSubmit={handleAuth} noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="E-Posta Adresi"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{
                '& .MuiInputBase-root': { color: '#fff' },
                '& .MuiInputLabel-root': { color: '#94a3b8' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#334155' },
                  '&:hover fieldset': { borderColor: '#64748b' }
                }
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Şifre"
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{
                '& .MuiInputBase-root': { color: '#fff' },
                '& .MuiInputLabel-root': { color: '#94a3b8' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#334155' },
                  '&:hover fieldset': { borderColor: '#64748b' }
                }
              }}
            />

            {authError && (
              <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                {authError}
              </Typography>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 3, mb: 1, py: 1.2, fontWeight: 'bold', borderRadius: 2 }}
            >
              {isSignUp ? 'Kayıt Ol' : 'Giriş Yap'}
            </Button>

            <Button
              color="inherit"
              size="small"
              onClick={() => setIsSignUp(!isSignUp)}
              sx={{ color: '#94a3b8', textTransform: 'none', mt: 1 }}
            >
              {isSignUp ? 'Zaten hesabınız var mı? Giriş Yapın' : 'Hesabınız yok mu? Kayıt Olun'}
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }

  // -------------------------------------------------------------
  // DASHBOARD VIEW
  // -------------------------------------------------------------
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f8fafc', pb: 6 }}>
      {/* Navbar */}
      <AppBar position="static" elevation={1} sx={{ backgroundColor: '#0f172a' }}>
        <Toolbar>
          <ShowChartIcon sx={{ mr: 1.5, color: '#38bdf8' }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
            BIST Taraması
          </Typography>
          <Chip
            label="v1.0.0"
            size="small"
            color="primary"
            variant="outlined"
            sx={{ mr: 2, borderColor: '#38bdf8', color: '#38bdf8' }}
          />
          <Typography variant="body2" sx={{ mr: 2, color: '#94a3b8' }}>
            {session.user.email}
          </Typography>
          <Tooltip title="Çıkış Yap">
            <IconButton color="inherit" onClick={handleLogout}>
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4 }}>
        {/* Hata Mesajı (Limit Aşımı vb.) */}
        {errorMessage && (
          <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setErrorMessage('')}>
            {errorMessage}
          </Alert>
        )}

        {/* Son Güncelleme & Bilgi Kartları */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={4}>
            <Card elevation={2} sx={{ borderRadius: 2 }}>
              <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Hisse Havuzu
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5 }}>
                    {tickers.length}
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ListAltIcon />}
                  onClick={() => setOpenTickerDialog(true)}
                  sx={{ borderRadius: 2 }}
                >
                  Yönet
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Card elevation={2} sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  Son Taramadaki Uygun Hisseler
                </Typography>
                <Typography variant="h4" color="success.main" sx={{ fontWeight: 700, mt: 0.5 }}>
                  {scannedResults ? scannedResults.length : 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Card
              elevation={2}
              sx={{
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 3,
                py: 2
              }}
            >
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Son Güncelleme Bilgisi
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, color: '#334155', mt: 0.5 }}>
                  {scanLog
                    ? `${new Date(scanLog.scanned_at).toLocaleString('tr-TR')}`
                    : 'Henüz tarama yapılmadı'}
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={isScanning ? <CircularProgress size={18} color="inherit" /> : <RefreshIcon />}
                onClick={handleScan}
                disabled={isScanning}
                sx={{ borderRadius: 2 }}
              >
                {isScanning ? 'Taranıyor' : 'Yeni Tarama'}
              </Button>
            </Card>
          </Grid>
        </Grid>

        {/* Sonuç Tablosu */}
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}>
            Son Tarama Sonuçları
          </Typography>
          <StockListTable stocks={scannedResults} />
        </Box>
      </Container>

      {/* Hisse Yönetimi Modal Dialog */}
      <Dialog open={openTickerDialog} onClose={() => setOpenTickerDialog(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>Hisse Havuzu Yönetimi</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Örn: SASA"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
            />
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddTicker}>
              Ekle
            </Button>
          </Box>
          <List sx={{ maxHeight: 300, overflow: 'auto' }}>
            {tickers.map((t) => (
              <ListItem
                key={t.id}
                secondaryAction={
                  <IconButton edge="end" color="error" onClick={() => handleDeleteTicker(t.id)}>
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <ListItemText primary={t.symbol} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTickerDialog(false)}>Kapat</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
import { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';
import packageJson from '../package.json';
import {
  getLatestResults,
  runScanAll,
  getTickers,
  addTicker,
  deleteTicker,
  getStockDetails,
  getGainers
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
  Alert,
  CssBaseline,
  ThemeProvider,
  createTheme,
  Slider
} from '@mui/material';

import RefreshIcon from '@mui/icons-material/Refresh';
import LogoutIcon from '@mui/icons-material/Logout';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import ListAltIcon from '@mui/icons-material/ListAlt';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';

function formatStockData(dataList) {
  if (!Array.isArray(dataList)) return [];
  return dataList.map((item) => ({
    Hisse: item.symbol || item.Hisse || '',
    Fiyat: item.price ?? item.Fiyat ?? 0,
    ALMA9_Mesafe: item.alma_dist ?? item.ALMA9_Mesafe ?? 0,
    VWMA21_Mesafe: item.vwma_dist ?? item.VWMA21_Mesafe ?? 0,
    ADX: item.adx ?? item.ADX ?? 0,
    CMF: item.cmf ?? item.CMF ?? 0
  }));
}

function formatNumber(value, options = {}) {
  if (value == null || !Number.isFinite(value)) return '-';
  return value.toLocaleString('tr-TR', options);
}

const appVersion = `v${packageJson.version}`;

function getStoredThemeMode() {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const storedMode = window.localStorage.getItem('bist-dashboard-theme-mode');
  if (storedMode === 'light' || storedMode === 'dark') {
    return storedMode;
  }

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function AuthScreen({
  appVersion,
  mode,
  onToggleMode,
  email,
  setEmail,
  password,
  setPassword,
  authError,
  handleAuth
}) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: (theme) =>
          mode === 'dark'
            ? 'linear-gradient(180deg, #020617 0%, #0f172a 100%)'
            : 'linear-gradient(180deg, #eff6ff 0%, #f8fafc 100%)',
        px: { xs: 1.5, sm: 2 },
        py: { xs: 2, sm: 0 }
      }}
    >
      <Paper
        elevation={6}
        sx={{
          p: { xs: 2.5, sm: 4 },
          width: '100%',
          maxWidth: 420,
          borderRadius: 3,
          backgroundColor: 'background.paper',
          color: 'text.primary',
          textAlign: 'center'
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          <Tooltip title={mode === 'dark' ? 'Açık moda geç' : 'Karanlık moda geç'}>
            <IconButton onClick={onToggleMode} size="small" color="inherit">
              {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
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
        <Typography component="h1" variant="h5" sx={{ fontWeight: 700, mb: 1, fontSize: { xs: '1.35rem', sm: '1.5rem' } }}>
          BIST Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, px: { xs: 0.5, sm: 0 } }}>
          Supabase hesabınızla giriş yapın ({appVersion})
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
              '& .MuiInputBase-root': { color: 'text.primary' },
              '& .MuiInputLabel-root': { color: 'text.secondary' },
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'divider' },
                '&:hover fieldset': { borderColor: 'text.secondary' }
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
              '& .MuiInputBase-root': { color: 'text.primary' },
              '& .MuiInputLabel-root': { color: 'text.secondary' },
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'divider' },
                '&:hover fieldset': { borderColor: 'text.secondary' }
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
            Giriş Yap
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}

function DashboardShell({
  appVersion,
  mode,
  onToggleMode,
  session,
  handleLogout,
  errorMessage,
  setErrorMessage,
  tickers,
  setOpenTickerDialog,
  scannedResults,
  scanLog,
  isScanning,
  handleScan,
  handleSelectStock,
  openTickerDialog,
  setNewSymbol,
  newSymbol,
  handleAddTicker,
  handleDeleteTicker,
  tickersList,
  isDetailsOpen,
  setIsDetailsOpen,
  selectedSymbol,
  stockDetails,
  isLoadingDetails,
  detailsError,
  gainers,            
  isLoadingGainers,   
  gainersError,       
  setGainersError,    
  handleFetchGainers  
}) {

  const [almaDistRange, setAlmaDistRange] = useState([2.0, 6.0]);
  const [vwmaDistRange, setVwmaDistRange] = useState([2.0, 6.0]);

  const handleAlmaDistChange = (event, newValue) => {
    console.log('Alma Mesafe Aralığı değişti:', newValue);
    setAlmaDistRange(newValue);
  };

  const handleVwmaDistChange = (event, newValue) => {
    console.log('VWMA Mesafe Aralığı değişti:', newValue);
    setVwmaDistRange(newValue);
  };
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', pb: 6 }}>
      <AppBar position="static" elevation={1} sx={{ backgroundColor: 'background.paper', color: 'text.primary' }}>
        <Toolbar sx={{ flexWrap: 'wrap', gap: 1, py: 1 }}>
          <ShowChartIcon sx={{ mr: 1.5, color: 'primary.main' }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700, minWidth: 0 }}>
            BIST Taraması
          </Typography>
          <Chip
            label={appVersion}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ mr: { xs: 0, sm: 2 } }}
          />
          <Tooltip title={mode === 'dark' ? 'Açık moda geç' : 'Karanlık moda geç'}>
            <IconButton onClick={onToggleMode} color="inherit">
              {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>
          <Typography variant="body2" sx={{ mr: { xs: 0, sm: 2 }, color: 'text.secondary', width: { xs: '100%', sm: 'auto' } }}>
            {session.user.email}
          </Typography>
          <Tooltip title="Çıkış Yap">
            <IconButton color="inherit" onClick={handleLogout}>
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: { xs: 2, sm: 4 }, px: { xs: 1.5, sm: 3 } }}>
        {errorMessage && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setErrorMessage('')}>
            {errorMessage}
          </Alert>
        )}

        <Grid container spacing={2.5} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={4}>
            <Card elevation={2} sx={{ borderRadius: 2, backgroundColor: 'background.paper' }}>
              <CardContent
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: 2,
                  justifyContent: 'space-between',
                  alignItems: { xs: 'flex-start', sm: 'center' }
                }}
              >
                <Box sx={{ minWidth: 0 }}>
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
                  sx={{ borderRadius: 2, width: { xs: '100%', sm: 'auto' } }}
                >
                  Yönet
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Card elevation={2} sx={{ borderRadius: 2, backgroundColor: 'background.paper' }}>
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
            <Card elevation={2} sx={{ borderRadius: 2, backgroundColor: 'background.paper' }}>
              <CardContent
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  alignItems: { xs: 'flex-start', sm: 'center' }
                }}
              >
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Son Güncelleme Bilgisi
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, color: 'text.secondary', mt: 0.5 }}>
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
                  sx={{ borderRadius: 2, width: '100%' }}
                >
                  {isScanning ? 'Taranıyor' : 'Yeni Tarama'}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: 'text.primary' }}>
            Son Tarama Sonuçları
          </Typography>
          <StockListTable stocks={scannedResults} onSelectStock={handleSelectStock} />
        </Box>

        <Box sx={{ mt: 5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
              Bugün %9.5+ Yükselenler
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={isLoadingGainers ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
              onClick={handleFetchGainers}
              disabled={isLoadingGainers}
              sx={{ borderRadius: 2 }}
            >
              {isLoadingGainers ? 'Taranıyor' : 'Yükselenleri Getir'}
            </Button>
          </Box>

          {gainersError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setGainersError('')}>
              {gainersError}
            </Alert>
          )}

          <Paper elevation={2} sx={{ borderRadius: 2, p: 3, mb: 4, backgroundColor: 'background.paper' }}>
            <Grid container spacing={4}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Alma Mesafe Aralığı
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {almaDistRange[0].toFixed(2)}% – {almaDistRange[1].toFixed(2)}%
                  </Typography>
                </Box>
                <Slider
                  getAriaLabel={() => 'Alma Mesafe Aralığı'}
                  value={almaDistRange}
                  onChange={handleAlmaDistChange}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => `${value.toFixed(2)}%`}
                  getAriaValueText={(value) => `${value}%`}
                  min={0.10}
                  max={10}
                  step={0.10}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    VWMA Mesafe Aralığı
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {vwmaDistRange[0].toFixed(2)}% – {vwmaDistRange[1].toFixed(2)}%
                  </Typography>
                </Box>
                <Slider
                  getAriaLabel={() => 'Vwma Mesafe Aralığı'}
                  value={vwmaDistRange}
                  onChange={handleVwmaDistChange}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => `${value.toFixed(2)}%`}
                  getAriaValueText={(value) => `${value}%`}
                  min={0.10}
                  max={10}
                  step={0.10}
                />
              </Grid>
            </Grid>
          </Paper>
        </Box>
      </Container>

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
            {tickersList.map((t) => (
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

      <Dialog open={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>
          {stockDetails?.name || `${selectedSymbol} Detayları`}
        </DialogTitle>
        <DialogContent dividers>
          {isLoadingDetails && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress aria-label="Hisse detayları yükleniyor" />
            </Box>
          )}

          {detailsError && <Alert severity="error">{detailsError}</Alert>}

          {stockDetails && !isLoadingDetails && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  {stockDetails.symbol} · {stockDetails.currency}
                  {stockDetails.delayedByMinutes != null && ` · ${stockDetails.delayedByMinutes} dk gecikmeli`}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5 }}>
                  {formatNumber(stockDetails.price, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                </Typography>
                <Typography
                  color={stockDetails.change == null || stockDetails.change >= 0 ? 'success.main' : 'error.main'}
                  sx={{ fontWeight: 600 }}
                >
                  {stockDetails.change != null && stockDetails.change >= 0 ? '+' : ''}
                  {formatNumber(stockDetails.change, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({stockDetails.changePercent != null && stockDetails.changePercent >= 0 ? '+' : ''}
                  {formatNumber(stockDetails.changePercent, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%)
                </Typography>
              </Grid>

              {[
                ['Açılış', stockDetails.open, 'fiyat'],
                ['Gün içi düşük', stockDetails.low, 'fiyat'],
                ['Gün içi yüksek', stockDetails.high, 'fiyat'],
                ['Önceki kapanış', stockDetails.previousClose, 'fiyat'],
                ['Hacim', stockDetails.volume, 'adet'],
                ['3 aylık ort. hacim', stockDetails.averageVolume, 'adet'],
                ['52 hf. düşük', stockDetails.fiftyTwoWeekLow, 'fiyat'],
                ['52 hf. yüksek', stockDetails.fiftyTwoWeekHigh, 'fiyat'],
                ['Piyasa değeri', stockDetails.marketCap, 'para'],
                ['F/K', stockDetails.trailingPE, 'oran'],
                ['PD/DD', stockDetails.priceToBook, 'oran']
              ].map(([label, value, type]) => (
                <Grid item xs={6} sm={4} key={label}>
                  <Typography variant="caption" color="text.secondary">
                    {label}
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {type === 'fiyat' && `${formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`}
                    {type === 'adet' && formatNumber(value, { maximumFractionDigits: 0 })}
                    {type === 'para' && `${formatNumber(value, { maximumFractionDigits: 0 })} ₺`}
                    {type === 'oran' && formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                </Grid>
              ))}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDetailsOpen(false)}>Kapat</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [mode, setMode] = useState(getStoredThemeMode());

  const [scannedResults, setScannedResults] = useState([]);
  const [scanLog, setScanLog] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [tickers, setTickers] = useState([]);
  const [openTickerDialog, setOpenTickerDialog] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [stockDetails, setStockDetails] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState('');
 
  const [gainers, setGainers] = useState([]);
  const [isLoadingGainers, setIsLoadingGainers] = useState(false);
  const [gainersError, setGainersError] = useState('');
  

  useEffect(() => {
    window.localStorage.setItem('bist-dashboard-theme-mode', mode);
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: { main: '#38bdf8' },
          ...(mode === 'dark'
            ? {
                background: {
                  default: '#020617',
                  paper: '#0f172a'
                }
              }
            : {
                background: {
                  default: '#f8fafc',
                  paper: '#ffffff'
                }
              })
        },
        shape: {
          borderRadius: 10
        }
      }),
    [mode]
  );

  const toggleMode = () => {
    setMode((currentMode) => (currentMode === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchLatestResults() {
    try {
      const data = await getLatestResults();
      setScannedResults(formatStockData(data?.results));
      setScanLog(data?.log || null);
      handleFetchGainers();
    } catch (err) {
      console.error('Sonuçlar alınamadı:', err);
      setErrorMessage('Kayıtlı tarama sonuçları yüklenemedi.');
    }
  }

  async function fetchTickers() {
    try {
      const data = await getTickers();
      setTickers(data || []);
    } catch (err) {
      console.error('Hisseler yüklenirken hata:', err);
    }
  }

  const handleScan = async () => {
    try {
      setIsScanning(true);
      setErrorMessage('');
      const data = await runScanAll(session?.user?.id);
      setScannedResults(formatStockData(data?.results));
      setScanLog(data?.log || null);
    } catch (err) {
      console.error('Tarama hatası:', err);
      setErrorMessage(err.response?.data?.error || 'Tarama başlatılamadı.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleFetchGainers = async () => {
  try {
    setIsLoadingGainers(true);
    setGainersError('');
    const data = await getGainers(9.5);
    setGainers(data?.results || []);
  } catch (err) {
    console.error('Yükselenler alınamadı:', err);
    setGainersError(err.response?.data?.error || 'Yükselenler alınamadı.');
  } finally {
    setIsLoadingGainers(false);
  }
};

  useEffect(() => {
    if (session) {
      const timer = window.setTimeout(() => {
        void fetchLatestResults();
        void fetchTickers();
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [session]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

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
    } catch {
      alert('Hisse silinirken hata oluştu.');
    }
  };

  const handleSelectStock = async (symbol) => {
    setSelectedSymbol(symbol);
    setStockDetails(null);
    setDetailsError('');
    setIsDetailsOpen(true);
    setIsLoadingDetails(true);

    try {
      setStockDetails(await getStockDetails(symbol));
    } catch (err) {
      setDetailsError(err.response?.data?.error || 'Hisse detayları alınamadı.');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  if (!session) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        <AuthScreen
          appVersion={appVersion}
          mode={mode}
          onToggleMode={toggleMode}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          authError={authError}
          handleAuth={handleAuth}
        />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      <DashboardShell
        appVersion={appVersion}
        mode={mode}
        onToggleMode={toggleMode}
        session={session}
        handleLogout={handleLogout}
        errorMessage={errorMessage}
        setErrorMessage={setErrorMessage}
        tickers={tickers}
        setOpenTickerDialog={setOpenTickerDialog}
        scannedResults={scannedResults}
        scanLog={scanLog}
        isScanning={isScanning}
        handleScan={handleScan}
        handleSelectStock={handleSelectStock}
        openTickerDialog={openTickerDialog}
        setNewSymbol={setNewSymbol}
        newSymbol={newSymbol}
        handleAddTicker={handleAddTicker}
        handleDeleteTicker={handleDeleteTicker}
        tickersList={tickers}
        isDetailsOpen={isDetailsOpen}
        setIsDetailsOpen={setIsDetailsOpen}
        selectedSymbol={selectedSymbol}
        stockDetails={stockDetails}
        isLoadingDetails={isLoadingDetails}
        detailsError={detailsError}
        gainers={gainers}
        isLoadingGainers={isLoadingGainers}
        gainersError={gainersError}
        setGainersError={setGainersError}
        handleFetchGainers={handleFetchGainers}
      />
    </ThemeProvider>
  );
}

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip
} from '@mui/material';

export default function StockListTable({ stocks }) {
  if (!stocks || stocks.length === 0) {
    return (
      <Paper elevation={1} sx={{ p: 3, textAlign: 'center', borderRadius: 2 }}>
        <Typography color="text.secondary">
          Kriterlere uyan hisse bulunamadı veya henüz tarama yapılmadı.
        </Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 2 }}>
      <Table aria-label="Taranan Hisse Tablosu">
        <TableHead sx={{ backgroundColor: '#1e293b' }}>
          <TableRow>
            <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Hisse</TableCell>
            <TableCell align="right" sx={{ color: '#fff', fontWeight: 'bold' }}>Fiyat</TableCell>
            <TableCell align="right" sx={{ color: '#fff', fontWeight: 'bold' }}>ALMA9 Mesafe (%)</TableCell>
            <TableCell align="right" sx={{ color: '#fff', fontWeight: 'bold' }}>VWMA21 Mesafe (%)</TableCell>
            <TableCell align="right" sx={{ color: '#fff', fontWeight: 'bold' }}>ADX (14)</TableCell>
            <TableCell align="right" sx={{ color: '#fff', fontWeight: 'bold' }}>CMF (20)</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {stocks.map((row) => (
            <TableRow hover key={row.Hisse}>
              <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                <Chip label={row.Hisse} color="primary" variant="outlined" size="small" />
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                {row.Fiyat?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
              </TableCell>
              <TableCell align="right" sx={{ color: 'success.main', fontWeight: 600 }}>
                %{row.ALMA9_Mesafe}
              </TableCell>
              <TableCell align="right" sx={{ color: 'success.main', fontWeight: 600 }}>
                %{row.VWMA21_Mesafe}
              </TableCell>
              <TableCell align="right">
                {row.ADX !== null ? row.ADX : '-'}
              </TableCell>
              <TableCell align="right" sx={{ color: row.CMF >= 0 ? 'success.main' : 'error.main' }}>
                {row.CMF !== null ? row.CMF : '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
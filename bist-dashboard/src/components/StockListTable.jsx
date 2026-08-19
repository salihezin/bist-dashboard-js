import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
  TableSortLabel
} from '@mui/material';
import { useMemo, useState } from 'react';
import useMediaQuery from '@mui/material/useMediaQuery';

const COLUMNS = [
  { id: 'Hisse', label: 'Hisse', align: 'left' },
  { id: 'Fiyat', label: 'Fiyat', align: 'right', numeric: true },
  { id: 'ALMA9_Mesafe', label: 'ALMA9 Mesafe (%)', align: 'right', numeric: true },
  { id: 'VWMA21_Mesafe', label: 'VWMA21 Mesafe (%)', align: 'right', numeric: true },
  { id: 'ADX', label: 'ADX (14)', align: 'right', numeric: true },
  { id: 'CMF', label: 'CMF (20)', align: 'right', numeric: true }
];

function compareValues(left, right, isNumeric) {
  const leftValue = left ?? null;
  const rightValue = right ?? null;

  if (leftValue === null && rightValue === null) {
    return 0;
  }

  if (leftValue === null) {
    return 1;
  }

  if (rightValue === null) {
    return -1;
  }

  if (isNumeric) {
    return Number(leftValue) - Number(rightValue);
  }

  return String(leftValue).localeCompare(String(rightValue), 'tr-TR', { sensitivity: 'base' });
}

function getColumnDisplay(columnId) {
  if (columnId === 'CMF') {
    return { xs: 'none', md: 'table-cell' };
  }

  if (columnId === 'ADX') {
    return { xs: 'none', sm: 'table-cell' };
  }

  return { xs: 'table-cell', sm: 'table-cell' };
}

function formatPercent(value) {
  return `%${value ?? '-'}`;
}

export default function StockListTable({ stocks, onSelectStock }) {
  const [sortBy, setSortBy] = useState('Hisse');
  const [sortDirection, setSortDirection] = useState('asc');
  const isMobile = useMediaQuery('(max-width:599.95px)');

  const sortedStocks = useMemo(() => {
    if (!stocks) {
      return [];
    }

    const activeColumn = COLUMNS.find((column) => column.id === sortBy);

    return [...stocks].sort((left, right) => {
      const comparison = compareValues(left?.[sortBy], right?.[sortBy], activeColumn?.numeric);
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [stocks, sortBy, sortDirection]);

  const handleSort = (columnId) => {
    const isAscending = sortBy === columnId && sortDirection === 'asc';

    setSortBy(columnId);
    setSortDirection(isAscending ? 'desc' : 'asc');
  };

  const mobileSortColumns = COLUMNS.filter((column) => column.id !== 'CMF');

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
      {isMobile ? (
        <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {mobileSortColumns.map((column) => (
              <Chip
                key={column.id}
                label={column.label}
                clickable
                variant={sortBy === column.id ? 'filled' : 'outlined'}
                color={sortBy === column.id ? 'primary' : 'default'}
                onClick={() => handleSort(column.id)}
                sx={{ fontWeight: 600 }}
              />
            ))}
          </Box>

          {sortedStocks.map((row) => (
            <Box
              key={row.Hisse}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                p: 1.5,
                backgroundColor: 'background.paper'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1.25 }}>
                <Chip
                  label={row.Hisse}
                  color="primary"
                  variant="outlined"
                  size="small"
                  clickable
                  onClick={() => onSelectStock?.(row.Hisse)}
                  aria-label={`${row.Hisse} detaylarını göster`}
                />
                <Typography sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {row.Fiyat?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))' },
                  gap: 1
                }}
              >
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    ALMA9
                  </Typography>
                  <Typography sx={{ fontWeight: 600, color: 'success.main' }}>
                    {formatPercent(row.ALMA9_Mesafe)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    VWMA21
                  </Typography>
                  <Typography sx={{ fontWeight: 600, color: 'success.main' }}>
                    {formatPercent(row.VWMA21_Mesafe)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    ADX
                  </Typography>
                  <Typography sx={{ fontWeight: 600 }}>
                    {row.ADX !== null ? row.ADX : '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    CMF
                  </Typography>
                  <Typography sx={{ fontWeight: 600, color: row.CMF >= 0 ? 'success.main' : 'error.main' }}>
                    {row.CMF !== null ? row.CMF : '-'}
                  </Typography>
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      ) : (
        <Table aria-label="Taranan Hisse Tablosu" sx={{ minWidth: { xs: 720, sm: 'auto' } }}>
          <TableHead sx={{ backgroundColor: '#1e293b' }}>
            <TableRow>
              {COLUMNS.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align}
                  sortDirection={sortBy === column.id ? sortDirection : false}
                  sx={{
                    color: '#fff',
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                    px: { xs: 1.25, sm: 2 },
                    display: getColumnDisplay(column.id)
                  }}
                >
                  <TableSortLabel
                    active={sortBy === column.id}
                    direction={sortBy === column.id ? sortDirection : 'asc'}
                    onClick={() => handleSort(column.id)}
                    sx={{
                      color: '#fff',
                      '&.Mui-active': { color: '#fff' },
                      '& .MuiTableSortLabel-icon': { color: '#fff !important' }
                    }}
                  >
                    {column.label}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedStocks.map((row) => (
              <TableRow hover key={row.Hisse}>
                <TableCell component="th" scope="row" sx={{ fontWeight: 'bold', px: { xs: 1.25, sm: 2 }, whiteSpace: 'nowrap' }}>
                  <Chip
                    label={row.Hisse}
                    color="primary"
                    variant="outlined"
                    size="small"
                    clickable
                    onClick={() => onSelectStock?.(row.Hisse)}
                    aria-label={`${row.Hisse} detaylarını göster`}
                  />
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', px: { xs: 1.25, sm: 2 }, whiteSpace: 'nowrap' }}>
                  {row.Fiyat?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                </TableCell>
                <TableCell align="right" sx={{ color: 'success.main', fontWeight: 600, px: { xs: 1.25, sm: 2 }, whiteSpace: 'nowrap' }}>
                  %{row.ALMA9_Mesafe}
                </TableCell>
                <TableCell align="right" sx={{ color: 'success.main', fontWeight: 600, px: { xs: 1.25, sm: 2 }, whiteSpace: 'nowrap' }}>
                  %{row.VWMA21_Mesafe}
                </TableCell>
                <TableCell align="right" sx={{ px: { xs: 1.25, sm: 2 }, whiteSpace: 'nowrap', display: { xs: 'none', sm: 'table-cell' } }}>
                  {row.ADX !== null ? row.ADX : '-'}
                </TableCell>
                <TableCell align="right" sx={{ color: row.CMF >= 0 ? 'success.main' : 'error.main', px: { xs: 1.25, sm: 2 }, whiteSpace: 'nowrap', display: { xs: 'none', md: 'table-cell' } }}>
                  {row.CMF !== null ? row.CMF : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </TableContainer>
  );
}

import PropTypes from 'prop-types';
import {
  TableHead,
  TableRow,
  TableCell,
  TableSortLabel,
  Box
} from '@mui/material';
import { visuallyHidden } from '@mui/utils';

const headCells = [
  { id: 'symbol', numeric: false, label: 'Sembol' },
  { id: 'name', numeric: false, label: 'Endeks Adı' },
  { id: 'value', numeric: true, label: 'Son Değer' },
  { id: 'change', numeric: true, label: 'Değişim' },
  { id: 'changePercent', numeric: true, label: 'Değişim (%)' },
  { id: 'high', numeric: true, label: 'En Yüksek' },
  { id: 'low', numeric: true, label: 'En Düşük' },
];

export default function EnhancedTableHead(props) {
  const { order, orderBy, onRequestSort } = props;

  const createSortHandler = (property) => (event) => {
    onRequestSort(event, property);
  };

  return (
    <TableHead sx={{ backgroundColor: 'action.hover' }}>
      <TableRow>
        {headCells.map((headCell) => (
          <TableCell
            key={headCell.id}
            align={headCell.numeric ? 'right' : 'left'}
            sortDirection={orderBy === headCell.id ? order : false}
            sx={{ fontWeight: 'bold' }}
          >
            <TableSortLabel
              active={orderBy === headCell.id}
              direction={orderBy === headCell.id ? order : 'asc'}
              onClick={createSortHandler(headCell.id)}
            >
              {headCell.label}
              {orderBy === headCell.id ? (
                <Box component="span" sx={visuallyHidden}>
                  {order === 'desc' ? 'azalan sıralama' : 'artan sıralama'}
                </Box>
              ) : null}
            </TableSortLabel>
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}

EnhancedTableHead.propTypes = {
  onRequestSort: PropTypes.func.isRequired,
  order: PropTypes.oneOf(['asc', 'desc']).isRequired,
  orderBy: PropTypes.string.isRequired,
};
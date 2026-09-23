import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  Pagination,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import apiService, { AdminPayment, AdminPaymentType } from '../../services/api';
import { PAYMENT_TYPE_LABELS, money } from './adminLabels';

interface AdminPaymentsProps {
  onOpenUser: (userId: number) => void;
}

// Every purchase across subscriptions, listing promotions and featured artist weeks.
const AdminPayments: React.FC<AdminPaymentsProps> = ({ onOpenUser }) => {
  const [type, setType] = useState<'' | AdminPaymentType>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ payments: AdminPayment[]; paid_total: number; pagination: { page: number; total: number; totalPages: number } } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Debounce the search box
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let active = true;
    apiService.getAdminPayments({ type: type || undefined, search: search || undefined, page, limit: 25 })
      .then((result) => active && setData(result))
      .catch((err) => active && setError(err.message || 'Failed to load payments'));
    return () => {
      active = false;
    };
  }, [type, search, page]);

  return (
    <Box sx={{ py: 3 }}>
      <Box sx={{ px: 3, mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Type</InputLabel>
          <Select value={type} label="Type" onChange={(e) => { setType(e.target.value as '' | AdminPaymentType); setPage(1); }}>
            <MenuItem value="">All types</MenuItem>
            {(Object.keys(PAYMENT_TYPE_LABELS) as AdminPaymentType[]).map((t) => (
              <MenuItem key={t} value={t}>{PAYMENT_TYPE_LABELS[t]}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField size="small" placeholder="Search user or item" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} sx={{ minWidth: 240 }} />
        {data && (
          <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
            {data.pagination.total} payments · <strong>{money(data.paid_total)}</strong> paid
          </Typography>
        )}
      </Box>

      {error ? (
        <Alert severity="error" sx={{ mx: 3 }}>{error}</Alert>
      ) : !data ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : data.payments.length === 0 ? (
        <Typography color="text.secondary" sx={{ px: 3, py: 4 }}>No payments match.</Typography>
      ) : (
        <>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ pl: 3 }}>Date</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>What</TableCell>
                  <TableCell align="right" sx={{ pr: 3 }}>Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.payments.map((p, i) => (
                  <TableRow key={`${p.at}-${i}`} hover>
                    <TableCell sx={{ pl: 3, whiteSpace: 'nowrap' }}>
                      {new Date(p.at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </TableCell>
                    <TableCell>
                      {p.user_id ? (
                        <Link component="button" variant="body2" onClick={() => onOpenUser(p.user_id as number)} sx={{ textAlign: 'left' }}>
                          {p.user_name || p.user_email || `User #${p.user_id}`}
                        </Link>
                      ) : (
                        <Typography variant="body2" color="text.secondary">Deleted user</Typography>
                      )}
                    </TableCell>
                    <TableCell><Chip size="small" label={PAYMENT_TYPE_LABELS[p.type] || p.type} /></TableCell>
                    <TableCell>{p.description}</TableCell>
                    <TableCell align="right" sx={{ pr: 3, whiteSpace: 'nowrap' }}>
                      {p.source === 'plan' ? 'Included in plan' : p.source === 'admin' ? 'Free (admin)' : money(p.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
          {data.pagination.totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination count={data.pagination.totalPages} page={page} onChange={(_e, v) => setPage(v)} />
            </Box>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 3, mt: 2 }}>
            Subscriptions appear at their plan price when bought, plus each renewal charge from now on.
          </Typography>
        </>
      )}
    </Box>
  );
};

export default AdminPayments;

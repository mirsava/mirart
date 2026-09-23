import React, { useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { MoreVert as MoreVertIcon, Download as DownloadIcon, Search as SearchIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import apiService, { DirectoryUser, SubscriptionPlan, UserDirectoryParams } from '../../services/api';
import { money } from './adminLabels';

interface AdminUsersTableProps {
  onOpenUser: (userId: number) => void;
  onOpenMenu: (event: React.MouseEvent<HTMLElement>, user: DirectoryUser) => void;
  // Bump to reload after an action elsewhere (block, change type, delete...)
  refreshKey: number;
}

const relative = (value: string | null) => {
  if (!value) return 'Never';
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

// Admin is a solid charcoal chip so it never looks like the terracotta artist chip or the red "Blocked" status.
const typeChip = {
  admin: { color: 'secondary', variant: 'filled' },
  artist: { color: 'primary', variant: 'outlined' },
  buyer: { color: 'info', variant: 'outlined' },
} as const;

// Admin users table: one request per page, with filters, sorting, CSV export, and click-through to history.
const AdminUsersTable: React.FC<AdminUsersTableProps> = ({ onOpenUser, onOpenMenu, refreshKey }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState<Required<Pick<UserDirectoryParams, 'search' | 'type' | 'status' | 'plan' | 'sort'>>>({
    search: '',
    type: '',
    status: '',
    plan: '',
    sort: 'newest',
  });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Awaited<ReturnType<typeof apiService.getUserDirectory>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [exporting, setExporting] = useState(false);

  const setFilter = <K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  useEffect(() => {
    apiService.getSubscriptionPlans().then((p) => setPlans(Array.isArray(p) ? p : [])).catch(() => {});
  }, []);

  // Debounce the search box
  useEffect(() => {
    const t = setTimeout(() => {
      const value = searchInput.trim();
      setFilters((prev) => (prev.search === value ? prev : { ...prev, search: value }));
      if (value !== filters.search) setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiService.getUserDirectory({ ...filters, page, limit: 25 })
      .then((result) => {
        if (!active) return;
        setData(result);
        setError(null);
      })
      .catch((err) => active && setError(err.message || 'Failed to load users'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [filters, page, refreshKey]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      await apiService.downloadUserDirectoryCsv(filters);
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Export failed', { variant: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const counts = data?.counts;
  const quickFilters: Array<{ label: string; count?: number; active: boolean; apply: () => void }> = [
    { label: 'All', count: counts?.all_users, active: !filters.type && !filters.status, apply: () => setFilters((f) => ({ ...f, type: '', status: '' })) },
    { label: 'Artists', count: counts?.artists, active: filters.type === 'artist', apply: () => setFilters((f) => ({ ...f, type: 'artist', status: '' })) },
    { label: 'Buyers', count: counts?.buyers, active: filters.type === 'buyer', apply: () => setFilters((f) => ({ ...f, type: 'buyer', status: '' })) },
    { label: 'Admins', count: counts?.admins, active: filters.type === 'admin', apply: () => setFilters((f) => ({ ...f, type: 'admin', status: '' })) },
    { label: 'Blocked', count: counts?.blocked, active: filters.status === 'blocked', apply: () => setFilters((f) => ({ ...f, type: '', status: 'blocked' })) },
  ];

  return (
    <Box sx={{ py: 3 }}>
      <Box sx={{ px: 3, mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {quickFilters.map((q) => (
          <Chip
            key={q.label}
            label={q.count != null ? `${q.label} · ${q.count}` : q.label}
            color={q.active ? 'primary' : 'default'}
            variant={q.active ? 'filled' : 'outlined'}
            onClick={() => {
              q.apply();
              setPage(1);
            }}
          />
        ))}
      </Box>

      <Box sx={{ px: 3, mb: 2, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Search name, email or username"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} /> }}
          sx={{ minWidth: 260, flex: { xs: '1 1 100%', md: '0 1 320px' } }}
        />
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Type</InputLabel>
          <Select label="Type" value={filters.type} onChange={(e) => setFilter('type', e.target.value as typeof filters.type)}>
            <MenuItem value="">All types</MenuItem>
            <MenuItem value="artist">Artists</MenuItem>
            <MenuItem value="buyer">Buyers</MenuItem>
            <MenuItem value="admin">Admins</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Status</InputLabel>
          <Select label="Status" value={filters.status} onChange={(e) => setFilter('status', e.target.value as typeof filters.status)}>
            <MenuItem value="">Any status</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
            <MenuItem value="blocked">Blocked</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Plan</InputLabel>
          <Select label="Plan" value={filters.plan} onChange={(e) => setFilter('plan', e.target.value)}>
            <MenuItem value="">Any plan</MenuItem>
            <MenuItem value="any">Paid plan</MenuItem>
            <MenuItem value="none">No plan</MenuItem>
            {plans.map((p) => <MenuItem key={p.id} value={p.name}>{p.name}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 170 }}>
          <InputLabel>Sort by</InputLabel>
          <Select label="Sort by" value={filters.sort} onChange={(e) => setFilter('sort', e.target.value as typeof filters.sort)}>
            <MenuItem value="newest">Newest</MenuItem>
            <MenuItem value="active">Recently active</MenuItem>
            <MenuItem value="listings">Most listings</MenuItem>
            <MenuItem value="spend">Top spenders</MenuItem>
            <MenuItem value="name">Name (A–Z)</MenuItem>
          </Select>
        </FormControl>
        <Box sx={{ flex: 1 }} />
        {data && <Typography variant="body2" color="text.secondary">{data.pagination.total} users</Typography>}
        <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={exportCsv} disabled={exporting} sx={{ textTransform: 'none' }}>
          {exporting ? 'Exporting…' : 'Export CSV'}
        </Button>
      </Box>

      {error ? (
        <Alert severity="error" sx={{ mx: 3 }}>{error}</Alert>
      ) : !data ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : data.users.length === 0 ? (
        <Typography color="text.secondary" sx={{ px: 3, py: 4 }}>No users match these filters.</Typography>
      ) : (
        <Box sx={{ overflowX: 'auto', opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ pl: 3 }}>User</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Plan</TableCell>
                <TableCell align="right">Listings</TableCell>
                <TableCell align="right">Paid</TableCell>
                <TableCell>Last active</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell align="right" sx={{ pr: 2 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {data.users.map((u) => (
                <TableRow
                  key={u.id}
                  hover
                  onClick={() => onOpenUser(u.id)}
                  sx={{ cursor: 'pointer', '&:last-child td': { border: 0 } }}
                >
                  <TableCell sx={{ pl: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 220 }}>
                      <Avatar src={u.profile_image_url || undefined} sx={{ width: 36, height: 36, bgcolor: 'primary.main' }}>
                        {u.display_name.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{u.display_name}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap component="div">
                          {u.email}{u.username ? ` · @${u.username}` : ''}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={u.user_type} color={typeChip[u.user_type].color} variant={typeChip[u.user_type].variant} sx={{ textTransform: 'capitalize' }} />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={u.blocked ? 'Blocked' : u.active ? 'Active' : 'Inactive'}
                      color={u.blocked ? 'error' : u.active ? 'success' : 'warning'}
                    />
                  </TableCell>
                  <TableCell>
                    {u.plan_name ? (
                      <Tooltip title={`${u.billing_period}, ends ${new Date(u.plan_end_date as string).toLocaleDateString()}${u.plan_auto_renew ? '' : ' (not renewing)'}`}>
                        <Typography variant="body2">{u.plan_name}</Typography>
                      </Tooltip>
                    ) : (
                      <Typography variant="body2" color="text.secondary">—</Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">{u.listings_active}<Typography component="span" variant="caption" color="text.secondary"> / {u.listings_total}</Typography></Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color={u.paid_total > 0 ? 'text.primary' : 'text.secondary'}>
                      {u.paid_total > 0 ? money(u.paid_total) : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}><Typography variant="body2">{relative(u.last_sign_in_at)}</Typography></TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <Typography variant="body2">{new Date(u.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ pr: 2 }}>
                    <IconButton
                      size="small"
                      aria-label={`Actions for ${u.display_name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenMenu(e, u);
                      }}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      {data && data.pagination.totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination count={data.pagination.totalPages} page={page} onChange={(_e, v) => setPage(v)} />
        </Box>
      )}
    </Box>
  );
};

export default AdminUsersTable;

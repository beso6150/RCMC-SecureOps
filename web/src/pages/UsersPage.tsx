import SearchIcon from '@mui/icons-material/Search';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { USERS_QUERY_KEYS, listUsers } from '../api/users';
import { useAuth } from '../auth/AuthContext';
import { RoleCodes } from '../auth/rbac';
import { USER_STATUS_LABELS } from './director/directorLabels';

export function UsersPage() {
  const { user } = useAuth();
  const isDirector = user?.roleCode === RoleCodes.SECURITY_DIRECTOR;
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const listParams = { page: page + 1, pageSize, search: search || undefined };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: USERS_QUERY_KEYS.list(listParams),
    queryFn: () => listUsers(listParams),
    enabled: !isDirector,
  });

  if (isDirector) {
    return <Navigate to="/director/users" replace />;
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return <Alert severity="error">{(error as Error)?.message ?? 'تعذّر تحميل المستخدمين.'}</Alert>;
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
        المستخدمون
      </Typography>

      <TextField
        size="small"
        placeholder="بحث بالاسم أو الرقم الوظيفي..."
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            setSearch(searchInput);
            setPage(0);
          }
        }}
        sx={{ mb: 2, minWidth: 320 }}
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => {
                    setSearch(searchInput);
                    setPage(0);
                  }}
                >
                  <SearchIcon />
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />

      <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>الاسم</TableCell>
              <TableCell>الرقم الوظيفي</TableCell>
              <TableCell>الدور</TableCell>
              <TableCell>الحالة</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.data.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{row.fullName}</TableCell>
                <TableCell>{row.employeeNumber}</TableCell>
                <TableCell>{row.role?.nameAr ?? row.role?.nameEn ?? '—'}</TableCell>
                <TableCell>
                  <Chip
                    label={USER_STATUS_LABELS[row.status] ?? row.status}
                    size="small"
                    color={row.status === 'ACTIVE' ? 'success' : 'default'}
                    variant="outlined"
                  />
                </TableCell>
              </TableRow>
            ))}
            {!data?.data.length && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">لا يوجد مستخدمون</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {data?.meta ? (
        <TablePagination
          component="div"
          count={data.meta.total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={pageSize}
          onRowsPerPageChange={(e) => {
            setPageSize(parseInt(e.target.value, 10));
            setPage(0);
          }}
          labelRowsPerPage="صفوف لكل صفحة"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} من ${count}`}
        />
      ) : null}
    </Box>
  );
}

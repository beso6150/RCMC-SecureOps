import {
  Alert,
  Box,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { ROLES_QUERY_KEYS, listRoles } from '../api/roles';
import { useAuth } from '../auth/AuthContext';
import { RoleCodes } from '../auth/rbac';

export function PermissionsPage() {
  const { user } = useAuth();
  const isDirector = user?.roleCode === RoleCodes.SECURITY_DIRECTOR;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ROLES_QUERY_KEYS.list,
    queryFn: listRoles,
    enabled: !isDirector,
  });

  if (isDirector) {
    return <Navigate to="/director/permissions" replace />;
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return <Alert severity="error">{(error as Error)?.message ?? 'تعذّر تحميل الأدوار.'}</Alert>;
  }

  const rows = data ?? [];

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
        الصلاحيات والأدوار
      </Typography>

      <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>الاسم (عربي)</TableCell>
              <TableCell>الرمز</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">لا توجد أدوار</Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{row.nameAr}</TableCell>
                  <TableCell>{row.code}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

import SaveIcon from '@mui/icons-material/Save';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormGroup,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { PERMISSIONS_QUERY_KEYS, listPermissions } from '../../api/permissions';
import { ROLES_QUERY_KEYS, getRole, listRoles, updateRolePermissions } from '../../api/roles';
import type { Permission } from '../../types/director';

function groupPermissions(permissions: Permission[]): Record<string, Permission[]> {
  return permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    const resource = p.resource || p.code.split(':')[0] || 'other';
    if (!acc[resource]) acc[resource] = [];
    acc[resource].push(p);
    return acc;
  }, {});
}

const RESOURCE_LABELS: Record<string, string> = {
  users: 'المستخدمون',
  roles: 'الأدوار',
  permissions: 'الصلاحيات',
  violations: 'المخالفات',
  visitors: 'الزوار',
  incidents: 'البلاغات',
  complaints: 'الشكاوى',
  reports: 'التقارير',
  settings: 'الإعدادات',
  director: 'مدير الأمن',
  dashboard: 'لوحة المعلومات',
  notifications: 'الإشعارات',
  floors: 'الطوابق',
  meeting_rooms: 'قاعات الاجتماعات',
  camera_requests: 'طلبات الكاميرات',
  cctv_dashboard: 'غرفة التحكم',
};

export function DirectorPermissionsPage() {
  const queryClient = useQueryClient();
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ROLES_QUERY_KEYS.list,
    queryFn: listRoles,
  });

  const { data: permissions = [], isLoading: permsLoading } = useQuery({
    queryKey: PERMISSIONS_QUERY_KEYS.list,
    queryFn: listPermissions,
  });

  const { data: roleDetail, isLoading: roleLoading } = useQuery({
    queryKey: ROLES_QUERY_KEYS.detail(selectedRoleId),
    queryFn: () => getRole(selectedRoleId),
    enabled: Boolean(selectedRoleId),
  });

  useEffect(() => {
    if (roles.length && !selectedRoleId) {
      setSelectedRoleId(roles[0].id);
    }
  }, [roles, selectedRoleId]);

  useEffect(() => {
    if (roleDetail) {
      setSelectedIds(new Set(roleDetail.permissions.map((p) => p.id)));
    }
  }, [roleDetail]);

  const grouped = useMemo(() => groupPermissions(permissions), [permissions]);

  const saveMutation = useMutation({
    mutationFn: () => updateRolePermissions(selectedRoleId, Array.from(selectedIds)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEYS.detail(selectedRoleId) });
      setSnackbar({ open: true, message: 'تم حفظ الصلاحيات', severity: 'success' });
    },
    onError: (err: Error) => {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    },
  });

  const togglePermission = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleResource = (resourcePerms: Permission[], checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const p of resourcePerms) {
        if (checked) next.add(p.id);
        else next.delete(p.id);
      }
      return next;
    });
  };

  if (rolesLoading || permsLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          إدارة الصلاحيات
        </Typography>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>الدور</InputLabel>
            <Select
              label="الدور"
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value)}
            >
              {roles.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.nameAr} ({r.code})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={() => saveMutation.mutate()}
            disabled={!selectedRoleId || saveMutation.isPending}
          >
            حفظ
          </Button>
        </Stack>
      </Stack>

      {roleLoading ? (
        <CircularProgress size={24} />
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>المورد</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الصلاحيات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.entries(grouped).map(([resource, perms]) => {
                const allChecked = perms.every((p) => selectedIds.has(p.id));
                const someChecked = perms.some((p) => selectedIds.has(p.id));
                return (
                  <TableRow key={resource}>
                    <TableCell sx={{ verticalAlign: 'top', minWidth: 140 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={allChecked}
                            indeterminate={someChecked && !allChecked}
                            onChange={(e) => toggleResource(perms, e.target.checked)}
                          />
                        }
                        label={
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {RESOURCE_LABELS[resource] ?? resource}
                          </Typography>
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <FormGroup row>
                        {perms.map((p) => (
                          <FormControlLabel
                            key={p.id}
                            control={
                              <Checkbox
                                size="small"
                                checked={selectedIds.has(p.id)}
                                onChange={() => togglePermission(p.id)}
                              />
                            }
                            label={
                              <Typography variant="caption" title={p.description ?? p.code}>
                                {p.action} ({p.code})
                              </Typography>
                            }
                          />
                        ))}
                      </FormGroup>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

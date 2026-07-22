import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import { useAuth } from '../auth/AuthContext';
import { ROLE_LABELS } from '../auth/rbac';

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', py: 1 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {value ?? '—'}
      </Typography>
    </Stack>
  );
}

export function ProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700 }} gutterBottom>
        الملف الشخصي
      </Typography>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700 }} gutterBottom>
                {user.fullName}
              </Typography>
              <Chip
                label={ROLE_LABELS[user.roleCode] || user.roleNameAr}
                color="secondary"
                size="small"
                sx={{ mb: 2 }}
              />

              <InfoRow label="رقم الهوية" value={user.nationalId} />
              <InfoRow label="رقم الموظف" value={user.employeeNumber} />
              <InfoRow label="البريد الإلكتروني" value={user.email} />
              <InfoRow label="الجوال" value={user.phone} />
              <InfoRow label="المسمى الوظيفي" value={user.jobTitle} />
              <InfoRow label="القسم" value={user.departmentNameAr} />
              <InfoRow label="الوردية" value={user.shiftNameAr} />
              <InfoRow
                label="آخر دخول"
                value={
                  user.lastLoginAt
                    ? new Date(user.lastLoginAt).toLocaleString('ar-SA')
                    : null
                }
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>
                الصلاحيات ({user.permissions.length})
              </Typography>
              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                {user.permissions.map((p) => (
                  <Chip key={p} label={p} size="small" variant="outlined" />
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

import {
  Card,
  CardContent,
  CardHeader,
  Chip,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { DashboardSummary } from '../../types/dashboard';

interface LatestTablesProps {
  tables: DashboardSummary['tables'];
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('ar-SA', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export function LatestTables({ tables }: LatestTablesProps) {
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, lg: 6 }}>
        <Card>
          <CardHeader title="أحدث المخالفات" />
          <CardContent sx={{ pt: 0 }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>اللوحة</TableCell>
                    <TableCell>النوع</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>التاريخ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tables.latestViolations.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>{row.plateNumber}</TableCell>
                      <TableCell>{row.violationType ?? '—'}</TableCell>
                      <TableCell>
                        <Chip label={row.status} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{formatDate(row.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                  {tables.latestViolations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <Typography variant="body2" color="text.secondary" align="center">
                          لا توجد مخالفات
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 6 }}>
        <Card>
          <CardHeader title="أحدث البلاغات" />
          <CardContent sx={{ pt: 0 }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>العنوان</TableCell>
                    <TableCell>النوع</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>التاريخ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tables.latestIncidents.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>{row.title}</TableCell>
                      <TableCell>{row.typeNameAr ?? '—'}</TableCell>
                      <TableCell>
                        <Chip label={row.status} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{formatDate(row.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                  {tables.latestIncidents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <Typography variant="body2" color="text.secondary" align="center">
                          لا توجد بلاغات
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 6 }}>
        <Card>
          <CardHeader title="أحدث الزوار" />
          <CardContent sx={{ pt: 0 }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>الاسم</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>موعد الزيارة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tables.latestVisitors.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>{row.visitorName}</TableCell>
                      <TableCell>
                        <Chip label={row.status} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{formatDate(row.visitDate ?? row.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                  {tables.latestVisitors.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3}>
                        <Typography variant="body2" color="text.secondary" align="center">
                          لا يوجد زوار
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 6 }}>
        <Card>
          <CardHeader title="إشعارات غير مقروءة" />
          <CardContent sx={{ pt: 0 }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>العنوان</TableCell>
                    <TableCell>المرسل</TableCell>
                    <TableCell>التاريخ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tables.unreadNotifications.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>{row.title}</TableCell>
                      <TableCell>{row.sender?.fullName ?? '—'}</TableCell>
                      <TableCell>{formatDate(row.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                  {tables.unreadNotifications.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3}>
                        <Typography variant="body2" color="text.secondary" align="center">
                          لا توجد إشعارات
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

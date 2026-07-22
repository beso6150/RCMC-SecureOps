import WbSunnyIcon from '@mui/icons-material/WbSunny';
import NightsStayIcon from '@mui/icons-material/NightsStay';
import GroupsIcon from '@mui/icons-material/Groups';
import HotelIcon from '@mui/icons-material/Hotel';
import SecurityIcon from '@mui/icons-material/Security';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PersonIcon from '@mui/icons-material/Person';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import TimerIcon from '@mui/icons-material/Timer';
import { Box, Grid, Typography } from '@mui/material';
import { LiveStatCard } from '../cctv/LiveStatCard';
import { useCountdownMs } from '../../hooks/useCountdownMs';
import type { ShiftOpsBoard } from '../../types/shifts';
import { formatMsToHMS, formatMsToMinutes } from '../../utils/formatDuration';

interface ShiftOpsCardsProps {
  shifts: ShiftOpsBoard;
}

export function ShiftOpsCards({ shifts }: ShiftOpsCardsProps) {
  const countdown = useCountdownMs(shifts.msRemainingToSwitch);
  const restingLabel =
    shifts.restingGroups.length > 0
      ? shifts.restingGroups.map((g) => g.label.nameAr).join('، ')
      : '—';

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        لوحة الورديات التشغيلية
      </Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <LiveStatCard
            label="الوردية الصباحية"
            value={shifts.morning.group.label.nameAr}
            icon={WbSunnyIcon}
            color="#d97706"
            subtitle={
              shifts.morning.isActive
                ? `نشطة · ${shifts.morning.guardCount} حارس · ${shifts.morning.supervisorCount} مشرف`
                : `${shifts.morning.guardCount} حارس · ${shifts.morning.supervisorCount} مشرف`
            }
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <LiveStatCard
            label="الوردية المسائية"
            value={shifts.evening.group.label.nameAr}
            icon={NightsStayIcon}
            color="#4338ca"
            subtitle={
              shifts.evening.isActive
                ? `نشطة · ${shifts.evening.guardCount} حارس · ${shifts.evening.supervisorCount} مشرف`
                : `${shifts.evening.guardCount} حارس · ${shifts.evening.supervisorCount} مشرف`
            }
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <LiveStatCard
            label="المجموعة الحالية"
            value={shifts.activeGroup.label.nameAr}
            icon={GroupsIcon}
            color="#00776c"
            subtitle={shifts.activeKindLabel.nameAr}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <LiveStatCard
            label="المجموعة التالية"
            value={shifts.nextGroup.label.nameAr}
            icon={GroupsIcon}
            color="#0891b2"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <LiveStatCard
            label="المجموعات في الراحة"
            value={restingLabel}
            icon={HotelIcon}
            color="#64748b"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <LiveStatCard
            label="عدد رجال الأمن في الخدمة"
            value={shifts.onDutyCount}
            icon={SecurityIcon}
            color="#2563eb"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <LiveStatCard
            label="في المهام"
            value={shifts.onTaskCount}
            icon={AssignmentIcon}
            color="#7c3aed"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <LiveStatCard
            label="المتاحين"
            value={shifts.availableCount}
            icon={PersonIcon}
            color="#16a34a"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <LiveStatCard
            label="البلاغات النشطة"
            value={shifts.activeIncidents}
            icon={ReportProblemIcon}
            color="#dc2626"
            pulse
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <LiveStatCard
            label="البلاغات الحرجة"
            value={shifts.criticalIncidents}
            icon={WarningAmberIcon}
            color="#b45309"
            pulse
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <LiveStatCard
            label="متوسط زمن الاستجابة"
            value={formatMsToMinutes(shifts.averageResponseMs)}
            icon={TimerIcon}
            color="#00776c"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <LiveStatCard
            label="الوقت المتبقي لتبديل الوردية"
            value={formatMsToHMS(countdown)}
            icon={TimerIcon}
            color="#0f766e"
          />
        </Grid>
      </Grid>
    </Box>
  );
}

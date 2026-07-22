import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import DirectionsCarFilledIcon from '@mui/icons-material/DirectionsCarFilled';
import VideocamIcon from '@mui/icons-material/Videocam';
import GroupsIcon from '@mui/icons-material/Groups';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import type { CctvTimelineItem } from '../../types/cctv';
import { SEVERITY_LABELS, TIMELINE_TYPE_LABELS } from './cctvLabels';
import { ElapsedTimer } from './ElapsedTimer';

const TYPE_ICONS = {
  incident: ReportProblemIcon,
  violation: DirectionsCarFilledIcon,
  camera_request: VideocamIcon,
  visitor: GroupsIcon,
} as const;

interface ControlRoomTimelineProps {
  items: CctvTimelineItem[];
  title?: string;
  maxHeight?: number;
}

export function ControlRoomTimeline({
  items,
  title = 'الخط الزمني المباشر',
  maxHeight = 360,
}: ControlRoomTimelineProps) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader title={title} subheader={`${items.length} حدث`} sx={{ pb: 0 }} />
      <CardContent sx={{ pt: 1 }}>
        {items.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            لا توجد أحداث حديثة
          </Typography>
        ) : (
          <List dense sx={{ maxHeight, overflow: 'auto', py: 0 }}>
            {items.map((item) => {
              const Icon = TYPE_ICONS[item.type];
              return (
                <ListItem
                  key={`${item.type}-${item.id}`}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    bgcolor: 'action.hover',
                    alignItems: 'flex-start',
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36, mt: 0.25 }}>
                    <Icon fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                          {item.title}
                        </Typography>
                        <ElapsedTimer since={item.createdAt} />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.25 }}>
                        <Typography variant="caption" color="text.secondary">
                          {TIMELINE_TYPE_LABELS[item.type] ?? item.type}
                        </Typography>
                        {item.priority ? (
                          <Typography variant="caption" color="warning.main">
                            {SEVERITY_LABELS[item.priority] ?? item.priority}
                          </Typography>
                        ) : null}
                      </Box>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </CardContent>
    </Card>
  );
}

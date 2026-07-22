import { Box, Card, CardContent, Typography } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';

interface LiveStatCardProps {
  label: string;
  value: number | string;
  icon: SvgIconComponent;
  color: string;
  subtitle?: string;
  pulse?: boolean;
}

export function LiveStatCard({
  label,
  value,
  icon: Icon,
  color,
  subtitle,
  pulse = false,
}: LiveStatCardProps) {
  return (
    <Card
      sx={{
        height: '100%',
        bgcolor: 'background.paper',
        borderInlineStart: `3px solid ${color}`,
      }}
    >
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1.5,
              display: 'grid',
              placeItems: 'center',
              bgcolor: `${color}18`,
              color,
              ...(pulse && value !== 0 && value !== '0'
                ? { animation: 'pulse 2s ease-in-out infinite', '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.65 } } }
                : {}),
            }}
          >
            <Icon fontSize="small" />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {label}
            </Typography>
            {subtitle ? (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            ) : null}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

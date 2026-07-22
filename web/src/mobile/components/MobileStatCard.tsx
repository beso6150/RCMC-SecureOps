import { Box, Typography } from '@mui/material';

interface MobileStatCardProps {
  label: string;
  value: string | number;
  accent?: string;
}

export function MobileStatCard({ label, value, accent = 'primary.main' }: MobileStatCardProps) {
  return (
    <Box
      className="mobile-card"
      sx={{
        minHeight: 88,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        borderInlineStart: 4,
        borderInlineStartColor: accent,
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 800, fontSize: '1.5rem', lineHeight: 1.2, mt: 0.5 }}>
        {value}
      </Typography>
    </Box>
  );
}

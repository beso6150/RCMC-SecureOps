import { Box, CircularProgress } from '@mui/material';

export function MobileLoadingState({ label = 'جاري التحميل…' }: { label?: string }) {
  return (
    <Box
      sx={{
        display: 'grid',
        placeItems: 'center',
        gap: 1.5,
        py: 8,
        color: 'text.secondary',
      }}
      role="status"
      aria-live="polite"
    >
      <CircularProgress size={36} />
      <Box component="span" sx={{ fontSize: 14, fontWeight: 600 }}>
        {label}
      </Box>
    </Box>
  );
}

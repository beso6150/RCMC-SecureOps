import { Box, Typography } from '@mui/material';
import { CctvViolationsQueuePage } from './cctv/CctvViolationsQueuePage';

export function ViolationsPage() {
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
        مخالفات المركبات
      </Typography>
      <CctvViolationsQueuePage />
    </Box>
  );
}

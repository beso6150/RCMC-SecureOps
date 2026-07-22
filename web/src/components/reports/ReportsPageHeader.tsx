import { Box, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface ReportsPageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function ReportsPageHeader({ title, subtitle, actions }: ReportsPageHeaderProps) {
  return (
    <Box
      className="no-print"
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 2,
        mb: 3,
      }}
    >
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {actions ? (
        <Stack
          direction="row"
          spacing={1}
          className="no-print"
          sx={{ alignItems: 'center', flexWrap: 'wrap' }}
        >
          {actions}
        </Stack>
      ) : null}
    </Box>
  );
}

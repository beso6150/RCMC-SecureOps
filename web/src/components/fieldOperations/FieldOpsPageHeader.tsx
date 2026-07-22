import { Box, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { SosButton } from './SosButton';

interface FieldOpsPageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  showSos?: boolean;
}

export function FieldOpsPageHeader({
  title,
  subtitle,
  actions,
  showSos = true,
}: FieldOpsPageHeaderProps) {
  return (
    <Box
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
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        {actions}
        {showSos ? <SosButton /> : null}
      </Stack>
    </Box>
  );
}

import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';

interface MobilePageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function MobilePageHeader({ title, subtitle, action }: MobilePageHeaderProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 1.5,
        mb: 2,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography component="h1" className="mobile-page-title">
          {title}
        </Typography>
        {subtitle ? (
          <Typography className="mobile-page-subtitle" component="p">
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {action ? <Box sx={{ flexShrink: 0 }}>{action}</Box> : null}
    </Box>
  );
}

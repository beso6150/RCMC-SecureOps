import type { ReactNode } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';

interface MobileListCardProps {
  title: string;
  subtitle?: string;
  meta?: string;
  statusLabel?: string;
  statusColor?: 'default' | 'info' | 'warning' | 'success' | 'error' | 'primary' | 'secondary';
  trailing?: ReactNode;
  onClick?: () => void;
  children?: ReactNode;
}

export function MobileListCard({
  title,
  subtitle,
  meta,
  statusLabel,
  statusColor = 'default',
  trailing,
  onClick,
  children,
}: MobileListCardProps) {
  return (
    <Box
      className="mobile-card"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      sx={{
        mb: 1.25,
        cursor: onClick ? 'pointer' : 'default',
        WebkitTapHighlightColor: 'transparent',
        '&:active': onClick ? { transform: 'scale(0.985)', opacity: 0.96 } : undefined,
        transition: 'transform 120ms ease, opacity 120ms ease',
      }}
    >
      <Stack
        direction="row"
        spacing={1.5}
        sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.4 }} noWrap>
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }} noWrap>
              {subtitle}
            </Typography>
          ) : null}
          {meta ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              {meta}
            </Typography>
          ) : null}
        </Box>
        <Stack spacing={0.75} sx={{ alignItems: 'flex-end', flexShrink: 0 }}>
          {statusLabel ? (
            <Chip label={statusLabel} size="small" color={statusColor} variant="outlined" />
          ) : null}
          {trailing}
        </Stack>
      </Stack>
      {children ? <Box sx={{ mt: 1.25 }}>{children}</Box> : null}
    </Box>
  );
}

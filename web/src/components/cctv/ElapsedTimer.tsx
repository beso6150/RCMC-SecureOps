import { useEffect, useState } from 'react';
import { Typography, type TypographyProps } from '@mui/material';
import { formatElapsedArabic } from './cctvLabels';

interface ElapsedTimerProps extends TypographyProps {
  since: string | Date;
  tickMs?: number;
}

export function ElapsedTimer({ since, tickMs = 30_000, ...typographyProps }: ElapsedTimerProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), tickMs);
    return () => window.clearInterval(id);
  }, [tickMs, since]);

  return (
    <Typography component="span" variant="body2" color="text.secondary" {...typographyProps}>
      {formatElapsedArabic(since, now)}
    </Typography>
  );
}

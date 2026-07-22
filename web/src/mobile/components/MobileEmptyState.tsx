import { Box, Typography } from '@mui/material';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';

interface MobileEmptyStateProps {
  title: string;
  description?: string;
}

export function MobileEmptyState({ title, description }: MobileEmptyStateProps) {
  return (
    <Box
      className="mobile-card"
      sx={{
        textAlign: 'center',
        py: 5,
        px: 2,
        color: 'text.secondary',
      }}
    >
      <InboxOutlinedIcon sx={{ fontSize: 40, mb: 1, opacity: 0.55 }} />
      <Typography sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>{title}</Typography>
      {description ? (
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      ) : null}
    </Box>
  );
}

import { Button, Container, Typography } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { Link as RouterLink } from 'react-router-dom';

interface ForbiddenPageProps {
  message?: string;
}

export function ForbiddenPage({
  message = 'ليست لديك صلاحية للوصول إلى هذه الصفحة.',
}: ForbiddenPageProps) {
  return (
    <Container maxWidth="sm" sx={{ py: 10, textAlign: 'center' }}>
      <LockOutlinedIcon color="warning" sx={{ fontSize: 56, mb: 2 }} />
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
        403 — غير مصرح
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {message}
      </Typography>
      <Button component={RouterLink} to="/" variant="contained">
        العودة إلى الرئيسية
      </Button>
    </Container>
  );
}

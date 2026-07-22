import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import SecurityIcon from '@mui/icons-material/Security';
import {
  Box,
  Card,
  CardContent,
  Divider,
  Link,
  Stack,
  Typography,
} from '@mui/material';

export function AboutPage() {
  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <Card>
        <CardContent sx={{ py: 4, px: { xs: 2, sm: 4 } }}>
          <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center' }}>
            <SecurityIcon color="secondary" sx={{ fontSize: 56 }} />
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              RCMC SecureOps
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 600 }}>
              نظام إدارة العمليات الأمنية
            </Typography>

            <Divider sx={{ width: '100%', my: 1 }} />

            <Typography variant="body1" sx={{ fontWeight: 700 }}>
              المطور: بسام الحربي
            </Typography>

            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <PhoneIcon fontSize="small" color="action" />
              <Link href="tel:0556728911" underline="hover" color="inherit">
                0556728911
              </Link>
            </Stack>

            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <EmailIcon fontSize="small" color="action" />
              <Link href="mailto:bassam14s44@gmail.com" underline="hover" color="inherit">
                bassam14s44@gmail.com
              </Link>
            </Stack>

            <Typography variant="body2" color="text.secondary">
              الإصدار: 1.0.0
            </Typography>

            <Typography variant="caption" color="text.secondary" sx={{ mt: 2 }}>
              © 2026 جميع الحقوق محفوظة.
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

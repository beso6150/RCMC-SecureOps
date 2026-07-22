import { useEffect, useRef, useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import QRCode from 'qrcode';

interface QrCodePanelProps {
  value: string;
  label?: string;
  size?: number;
}

export function QrCodePanel({ value, label, size = 180 }: QrCodePanelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !value) return;
    setError(null);
    void QRCode.toCanvas(canvas, value, {
      width: size,
      margin: 2,
      color: { dark: '#0f2d5c', light: '#ffffff' },
    }).catch(() => setError('تعذّر إنشاء رمز QR.'));
  }, [value, size]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      setError('تعذّر نسخ القيمة.');
    }
  };

  const print = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const win = window.open('', '_blank', 'noopener,noreferrer,width=420,height=560');
    if (!win) return;
    win.document.write(`<!doctype html><html dir="rtl"><head><title>QR</title>
      <style>body{font-family:Cairo,Tahoma,sans-serif;text-align:center;padding:24px}
      img{width:240px;height:240px} code{display:block;margin-top:12px;word-break:break-all}</style>
      </head><body>
      <h2>${label ?? 'نقطة أمنية'}</h2>
      <img src="${dataUrl}" alt="QR" />
      <code>${value}</code>
      <script>window.onload=()=>window.print()</script>
      </body></html>`);
    win.document.close();
  };

  return (
    <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
      <Box
        sx={{
          p: 1.5,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
        <canvas ref={canvasRef} width={size} height={size} />
      </Box>
      {label ? (
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {label}
        </Typography>
      ) : null}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ wordBreak: 'break-all', textAlign: 'center', maxWidth: 280 }}
      >
        {value}
      </Typography>
      {error ? (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      ) : null}
      <Stack direction="row" spacing={1}>
        <Button size="small" variant="outlined" onClick={() => void copy()}>
          نسخ
        </Button>
        <Button size="small" variant="contained" onClick={print}>
          طباعة
        </Button>
      </Stack>
    </Stack>
  );
}

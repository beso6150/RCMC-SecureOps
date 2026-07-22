import { createTheme, type PaletteMode } from '@mui/material/styles';
import { arSA } from '@mui/material/locale';

const navy = {
  50: '#e8edf4',
  100: '#c5d0e3',
  200: '#9fb1cf',
  300: '#7892bb',
  400: '#5a7aac',
  500: '#3d639d',
  600: '#355b95',
  700: '#2b518a',
  800: '#22477f',
  900: '#0f2d5c',
};

const teal = {
  50: '#e0f4f3',
  100: '#b3e4e1',
  200: '#80d3cd',
  300: '#4dc2b9',
  400: '#26b5aa',
  500: '#00a89b',
  600: '#00998d',
  700: '#00877c',
  800: '#00766c',
  900: '#00574f',
};

export function createAppTheme(mode: PaletteMode) {
  const isDark = mode === 'dark';

  return createTheme(
    {
      direction: 'rtl',
      palette: {
        mode,
        primary: {
          main: isDark ? teal[300] : navy[800],
          light: isDark ? teal[200] : navy[600],
          dark: isDark ? teal[500] : navy[900],
          contrastText: '#ffffff',
        },
        secondary: {
          main: isDark ? teal[400] : teal[700],
          light: teal[300],
          dark: teal[900],
          contrastText: '#ffffff',
        },
        background: {
          default: isDark ? '#0a1628' : '#f4f7fb',
          paper: isDark ? '#122038' : '#ffffff',
        },
        divider: isDark ? 'rgba(148, 163, 184, 0.16)' : 'rgba(15, 45, 92, 0.12)',
        text: {
          primary: isDark ? '#e2e8f0' : navy[900],
          secondary: isDark ? '#94a3b8' : '#475569',
        },
        success: { main: '#16a34a' },
        warning: { main: '#d97706' },
        error: { main: '#dc2626' },
        info: { main: teal[500] },
      },
      typography: {
        fontFamily: '"Cairo", "Segoe UI", Tahoma, sans-serif',
        h4: { fontWeight: 700 },
        h5: { fontWeight: 700 },
        h6: { fontWeight: 600 },
        button: { fontWeight: 600, textTransform: 'none' },
      },
      shape: { borderRadius: 10 },
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            body: {
              scrollbarColor: isDark ? '#334155 #0a1628' : '#cbd5e1 #f4f7fb',
            },
          },
        },
        MuiAppBar: {
          defaultProps: { elevation: 0 },
          styleOverrides: {
            root: {
              borderBottom: `1px solid ${isDark ? 'rgba(148,163,184,0.12)' : 'rgba(15,45,92,0.08)'}`,
              backdropFilter: 'blur(8px)',
            },
          },
        },
        MuiDrawer: {
          styleOverrides: {
            paper: {
              borderInlineEnd: `1px solid ${isDark ? 'rgba(148,163,184,0.12)' : 'rgba(15,45,92,0.08)'}`,
            },
          },
        },
        MuiCard: {
          defaultProps: { elevation: 0 },
          styleOverrides: {
            root: {
              border: `1px solid ${isDark ? 'rgba(148,163,184,0.12)' : 'rgba(15,45,92,0.08)'}`,
            },
          },
        },
        MuiButton: {
          styleOverrides: {
            root: { borderRadius: 8 },
          },
        },
      },
    },
    arSA,
  );
}

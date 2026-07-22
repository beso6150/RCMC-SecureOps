import { useMemo, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { AuthProvider } from './auth/AuthContext';
import { AppRouter } from './routes/AppRouter';
import { createAppTheme } from './theme/theme';
import { STORAGE_KEYS } from './config/env';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

function getInitialColorMode(): 'light' | 'dark' {
  const stored = localStorage.getItem(STORAGE_KEYS.colorMode);
  if (stored === 'light' || stored === 'dark') return stored;
  return 'light';
}

export default function App() {
  const [colorMode, setColorMode] = useState<'light' | 'dark'>(getInitialColorMode);

  const cache = useMemo(
    () =>
      createCache({
        key: 'muirtl',
        stylisPlugins: [prefixer, rtlPlugin],
      }),
    [],
  );

  const theme = useMemo(() => createAppTheme(colorMode), [colorMode]);

  const toggleColorMode = () => {
    setColorMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem(STORAGE_KEYS.colorMode, next);
      return next;
    });
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CacheProvider value={cache}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <BrowserRouter>
              <AppRouter colorMode={colorMode} onToggleColorMode={toggleColorMode} />
            </BrowserRouter>
          </ThemeProvider>
        </CacheProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

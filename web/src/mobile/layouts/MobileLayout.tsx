import type { CSSProperties } from 'react';
import { Outlet } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { useMobileSafeArea } from '../hooks/useMobileSafeArea';
import '../styles/mobile.css';

export function MobileLayout() {
  const theme = useTheme();
  useMobileSafeArea();

  return (
    <div
      className="mobile-root"
      style={
        {
          ['--mobile-bg' as string]: theme.palette.background.default,
          ['--mobile-text' as string]: theme.palette.text.primary,
          ['--mobile-nav-bg' as string]: theme.palette.background.paper,
          ['--mobile-nav-muted' as string]: theme.palette.text.secondary,
          ['--mobile-nav-active' as string]: theme.palette.primary.main,
        } as CSSProperties
      }
    >
      <main className="mobile-main">
        <Outlet />
      </main>
      <MobileBottomNav />
    </div>
  );
}

/** Full-screen mobile shell without bottom navigation (login / password). */
export function MobileAuthLayout() {
  const theme = useTheme();
  useMobileSafeArea();

  return (
    <div
      className="mobile-root"
      style={
        {
          ['--mobile-bg' as string]: theme.palette.background.default,
          ['--mobile-text' as string]: theme.palette.text.primary,
        } as CSSProperties
      }
    >
      <main className="mobile-main mobile-main--auth">
        <Outlet />
      </main>
    </div>
  );
}

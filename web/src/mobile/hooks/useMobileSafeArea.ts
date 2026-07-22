import { useEffect } from 'react';

/**
 * Applies iOS Safari viewport / safe-area helpers while the mobile shell is mounted.
 */
export function useMobileSafeArea() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('mobile-viewport-active');
    root.style.setProperty('--sat', 'env(safe-area-inset-top)');
    root.style.setProperty('--sab', 'env(safe-area-inset-bottom)');
    root.style.setProperty('--sal', 'env(safe-area-inset-left)');
    root.style.setProperty('--sar', 'env(safe-area-inset-right)');

    return () => {
      root.classList.remove('mobile-viewport-active');
      root.style.removeProperty('--sat');
      root.style.removeProperty('--sab');
      root.style.removeProperty('--sal');
      root.style.removeProperty('--sar');
    };
  }, []);
}

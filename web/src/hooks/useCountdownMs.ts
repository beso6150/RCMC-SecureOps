import { useEffect, useState } from 'react';

export function useCountdownMs(initialMs: number, enabled = true): number {
  const [remaining, setRemaining] = useState(initialMs);

  useEffect(() => {
    setRemaining(initialMs);
  }, [initialMs]);

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [enabled, initialMs]);

  return remaining;
}

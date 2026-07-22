import { useCallback, useState } from 'react';

export interface GeoPosition {
  latitude: number;
  longitude: number;
}

export function useGeolocation() {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const capture = useCallback(async (): Promise<GeoPosition | null> => {
    if (!navigator.geolocation) {
      setError('المتصفح لا يدعم تحديد الموقع.');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const coords = await new Promise<GeoPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (result) => {
            resolve({
              latitude: result.coords.latitude,
              longitude: result.coords.longitude,
            });
          },
          (err) => reject(err),
          { enableHighAccuracy: true, timeout: 12_000, maximumAge: 5_000 },
        );
      });
      setPosition(coords);
      return coords;
    } catch {
      setError('تعذّر الحصول على الموقع الحالي.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { position, error, loading, capture };
}

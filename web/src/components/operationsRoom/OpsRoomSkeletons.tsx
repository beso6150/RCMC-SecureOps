import { Box, Card, CardContent, Skeleton, Stack } from '@mui/material';

export function OpsCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: '1fr 1fr',
          md: `repeat(${Math.min(count, 4)}, 1fr)`,
        },
        gap: 2,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent>
            <Skeleton variant="text" width="40%" height={36} />
            <Skeleton variant="text" width="70%" />
            <Skeleton variant="rectangular" height={48} sx={{ mt: 1, borderRadius: 1 }} />
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

export function OpsTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Stack spacing={1}>
      <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} variant="rectangular" height={44} sx={{ borderRadius: 1 }} />
      ))}
    </Stack>
  );
}

export function OpsDetailSkeleton() {
  return (
    <Stack spacing={2}>
      <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 1 }} />
      <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2 }} />
      <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
    </Stack>
  );
}

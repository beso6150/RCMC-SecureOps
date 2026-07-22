import { GlobalStyles } from '@mui/material';

/** Hide chrome and action bars when printing report pages. */
export function ReportsPrintStyles() {
  return (
    <GlobalStyles
      styles={{
        '@media print': {
          'aside, nav, .MuiDrawer-root, .MuiAppBar-root, .no-print': {
            display: 'none !important',
          },
          'main, .MuiBox-root': {
            padding: '0 !important',
            margin: '0 !important',
          },
          body: {
            background: '#fff !important',
            color: '#000 !important',
          },
          '.print-only': {
            display: 'block !important',
          },
          '.report-print-root': {
            boxShadow: 'none !important',
            border: 'none !important',
          },
        },
        '.print-only': {
          display: 'none',
        },
      }}
    />
  );
}

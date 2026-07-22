import { Link as RouterLink, useLocation } from 'react-router-dom';
import { Breadcrumbs, Link, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { NAV_LABELS } from '../../auth/rbac';

function buildCrumbs(pathname: string): Array<{ label: string; path?: string }> {
  if (pathname === '/') {
    return [{ label: 'الرئيسية' }];
  }

  const segments = pathname.split('/').filter(Boolean);
  const crumbs: Array<{ label: string; path?: string }> = [{ label: 'الرئيسية', path: '/' }];

  let current = '';
  for (const segment of segments) {
    current += `/${segment}`;
    crumbs.push({
      label: NAV_LABELS[current] ?? segment,
      path: current,
    });
  }

  return crumbs;
}

export function BreadcrumbsNav() {
  const { pathname } = useLocation();
  const crumbs = buildCrumbs(pathname);

  return (
    <Breadcrumbs
      separator={<NavigateNextIcon fontSize="small" />}
      aria-label="مسار التنقل"
      sx={{ mb: 2 }}
    >
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        if (isLast || !crumb.path) {
          return (
            <Typography key={crumb.label} color="text.primary" sx={{ fontWeight: 600 }}>
              {crumb.label}
            </Typography>
          );
        }
        return (
          <Link
            key={crumb.path}
            component={RouterLink}
            to={crumb.path}
            underline="hover"
            color="inherit"
          >
            {crumb.label}
          </Link>
        );
      })}
    </Breadcrumbs>
  );
}

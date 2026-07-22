import { NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { getMobileBottomNav } from '../config/mobileRoleAccess';

export function MobileBottomNav() {
  const { user } = useAuth();
  const items = getMobileBottomNav({
    roleCode: user?.roleCode ?? '',
    permissions: user?.permissions ?? [],
  });

  return (
    <nav className="mobile-bottom-nav" aria-label="التنقل السفلي">
      {items.map(({ to, end, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={Boolean(end)}
          className={({ isActive }) =>
            `mobile-bottom-nav__item${isActive ? ' is-active' : ''}`
          }
        >
          <Icon sx={{ fontSize: 22 }} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

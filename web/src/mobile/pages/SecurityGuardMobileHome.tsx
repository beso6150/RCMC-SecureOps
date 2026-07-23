import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, IconButton } from '@mui/material';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import { fetchDashboardSummary } from '../../api/dashboard';
import { useAuth } from '../../auth/AuthContext';
import { DASHBOARD_QUERY_KEY } from '../../hooks/useSocket';
import {
  MOBILE_ACCESS_DENIED_MESSAGE,
  getMobileHomeActions,
} from '../config/mobileRoleAccess';
import { MobileLoadingState } from '../components/MobileLoadingState';
import { useMobileDateFormat } from '../hooks/useMobileDateFormat';

interface LocationState {
  accessDenied?: boolean;
  message?: string;
}

const LOCATION_STORAGE_KEY = 'rcmc.mobile.guardLocation';

const GUARD_LOCATIONS = [
  { id: 'ground', label: 'المواقف الأرضية', short: 'P' },
  { id: 'p1', label: 'البيسمنت P1', short: 'P1' },
  { id: 'p2', label: 'البيسمنت P2', short: 'P2' },
  { id: 'west', label: 'المواقف الغربية', short: 'W' },
] as const;

type GuardLocationId = (typeof GUARD_LOCATIONS)[number]['id'];

function loadLocation(): GuardLocationId {
  try {
    const raw = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (raw && GUARD_LOCATIONS.some((l) => l.id === raw)) {
      return raw as GuardLocationId;
    }
  } catch {
    /* ignore */
  }
  return 'ground';
}

function formatNow() {
  const now = new Date();
  const date = now.toLocaleDateString('ar-SA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const time = now.toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return { date, time };
}

const STAT_META = [
  {
    key: 'todaysViolations' as const,
    label: 'المخالفات',
    hint: 'جديدة',
    tone: 'danger',
    Icon: DescriptionOutlinedIcon,
  },
  {
    key: 'todaysVisitors' as const,
    label: 'الزوار',
    hint: 'اليوم',
    tone: 'info',
    Icon: GroupsOutlinedIcon,
  },
  {
    key: 'openIncidents' as const,
    label: 'البلاغات',
    hint: 'جديدة',
    tone: 'warn',
    Icon: ChatBubbleOutlineOutlinedIcon,
  },
  {
    key: 'pendingTasks' as const,
    label: 'المهام',
    hint: 'قيد التنفيذ',
    tone: 'ok',
    Icon: AssignmentOutlinedIcon,
  },
];

export function SecurityGuardMobileHome() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { formatRelative } = useMobileDateFormat();
  const [deniedMessage, setDeniedMessage] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<GuardLocationId>(loadLocation);
  const [clock, setClock] = useState(formatNow);

  const ctx = useMemo(
    () => ({
      roleCode: user?.roleCode ?? '',
      permissions: user?.permissions ?? [],
    }),
    [user?.roleCode, user?.permissions],
  );

  const actions = useMemo(() => getMobileHomeActions(ctx), [ctx]);

  useEffect(() => {
    const state = location.state as LocationState | null;
    if (state?.accessDenied) {
      setDeniedMessage(state.message ?? MOBILE_ACCESS_DENIED_MESSAGE);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    const id = window.setInterval(() => setClock(formatNow()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: DASHBOARD_QUERY_KEY,
    queryFn: fetchDashboardSummary,
    refetchInterval: 60_000,
  });

  const currentLocation =
    GUARD_LOCATIONS.find((l) => l.id === selectedLocation) ?? GUARD_LOCATIONS[0];

  const shiftLabel =
    data?.shifts?.activeKindLabel?.nameAr ?? user?.shiftNameAr ?? 'الوردية الحالية';
  const isOnDuty = Boolean(data?.shifts?.sessionStatus === 'OPEN' || user);

  const alerts = useMemo(() => {
    if (!data) return [];
    return data.tables.unreadNotifications.slice(0, 3);
  }, [data]);

  const selectLocation = (id: GuardLocationId) => {
    setSelectedLocation(id);
    try {
      localStorage.setItem(LOCATION_STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  };

  if (isLoading) return <MobileLoadingState label="جاري تحميل لوحة الجوال…" />;

  if (isError || !data) {
    return (
      <Alert severity="error">
        {(error as Error)?.message ?? 'تعذّر تحميل ملخص العمليات.'}
      </Alert>
    );
  }

  return (
    <div className="guard-home">
      <header className="guard-home__topbar">
        <div className="guard-home__brand">
          <span className="guard-home__brand-icon" aria-hidden>
            <ShieldOutlinedIcon fontSize="small" />
          </span>
          <div className="guard-home__brand-text">
            <strong>RCMC SecureOps</strong>
            <span>رجل الأمن</span>
          </div>
        </div>

        <div className="guard-home__top-actions">
          <div className="guard-home__clock guard-home__secondary">
            <span>{clock.date}</span>
            <strong>{clock.time}</strong>
          </div>
          <IconButton
            className="guard-home__icon-btn guard-home__secondary"
            size="small"
            aria-label="الوضع الليلي"
            disabled
          >
            <DarkModeOutlinedIcon fontSize="small" />
          </IconButton>
          <IconButton
            component={RouterLink}
            to="/mobile/notifications"
            className="guard-home__icon-btn"
            size="small"
            aria-label="التنبيهات"
          >
            <Badge
              badgeContent={data.unreadNotifications || undefined}
              color="error"
              max={9}
              overlap="circular"
            >
              <NotificationsNoneOutlinedIcon fontSize="small" />
            </Badge>
          </IconButton>
        </div>
      </header>

      <div className="guard-home__body">
        {deniedMessage ? (
          <Alert severity="warning" sx={{ mb: 1.5 }} onClose={() => setDeniedMessage(null)}>
            {deniedMessage}
          </Alert>
        ) : null}

        <section className="guard-home__welcome" aria-label="ترحيب">
          <div className="guard-home__avatar" aria-hidden>
            <PersonOutlineOutlinedIcon />
            <span className="guard-home__online" />
          </div>
          <div className="guard-home__welcome-text">
            <h1>مرحباً، {user?.fullName ?? 'المستخدم'}</h1>
            <p>
              رجل الأمن
              {shiftLabel ? ` — ${shiftLabel}` : null}
            </p>
          </div>
        </section>

        <section className="guard-home__card" aria-label="حالتك اليوم">
          <div className="guard-home__card-head">
            <span>حالتك اليوم</span>
            <CheckCircleOutlineOutlinedIcon className="guard-home__ok-icon" fontSize="small" />
          </div>
          <p className={`guard-home__status ${isOnDuty ? 'is-active' : ''}`}>
            {isOnDuty ? 'نشط' : 'غير نشط'}
          </p>
          <p className="guard-home__shift-line">{shiftLabel}</p>
          <div className="guard-home__location-pill">
            <PlaceOutlinedIcon fontSize="small" />
            <span>{currentLocation.label}</span>
          </div>
        </section>

        <section className="guard-home__stats" aria-label="إحصائيات">
          {STAT_META.map(({ key, label, hint, tone, Icon }) => (
            <article key={key} className={`guard-home__stat guard-home__stat--${tone}`}>
              <div className="guard-home__stat-icon">
                <Icon fontSize="small" />
              </div>
              <div className="guard-home__stat-body">
                <strong>{data[key]}</strong>
                <span>{label}</span>
                <small>{hint}</small>
              </div>
            </article>
          ))}
        </section>

        <section className="guard-home__section" aria-label="إجراءات سريعة">
          <h2 className="guard-home__section-title">إجراءات سريعة</h2>
          <div className="guard-home__actions">
            {actions.map(({ id, label, to, Icon }, index) => (
              <RouterLink
                key={id}
                to={to}
                className={`guard-home__action${index === 0 ? ' is-primary' : ''}`}
              >
                <span className="guard-home__action-icon">
                  <Icon fontSize="small" />
                </span>
                <span>{label}</span>
              </RouterLink>
            ))}
          </div>
        </section>

        <section className="guard-home__card" aria-label="التنبيهات">
          <div className="guard-home__card-head">
            <span>التنبيهات</span>
            <NotificationsNoneOutlinedIcon fontSize="small" />
          </div>
          {alerts.length === 0 ? (
            <p className="guard-home__muted">لا توجد تنبيهات جديدة.</p>
          ) : (
            <ul className="guard-home__alerts">
              {alerts.map((item, index) => (
                <li key={item.id}>
                  <span
                    className={`guard-home__dot guard-home__dot--${
                      index === 0 ? 'danger' : index === 1 ? 'warn' : 'info'
                    }`}
                  />
                  <div>
                    <strong>{item.title}</strong>
                    <small>{formatRelative(item.createdAt)}</small>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <RouterLink to="/mobile/notifications" className="guard-home__link">
            عرض جميع التنبيهات
            <ArrowBackIosNewIcon sx={{ fontSize: 12 }} />
          </RouterLink>
        </section>

        <section className="guard-home__section" aria-label="المواقع">
          <h2 className="guard-home__section-title">المواقع</h2>
          <div className="guard-home__locations" role="listbox" aria-label="اختيار الموقع">
            {GUARD_LOCATIONS.map((site) => {
              const selected = site.id === selectedLocation;
              return (
                <button
                  key={site.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`guard-home__location${selected ? ' is-selected' : ''}`}
                  onClick={() => selectLocation(site.id)}
                >
                  <span className="guard-home__location-badge" aria-hidden>
                    {site.short}
                  </span>
                  <span>{site.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

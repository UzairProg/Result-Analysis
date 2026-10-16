import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  GraduationCap,
  ClipboardList,
  BarChart3,
  LineChart,
  UserCircle,
  LogOut,
  Award,
} from 'lucide-react';

const ADMIN_NAV = [
  { section: 'Overview' },
  { label: 'Dashboard', icon: LayoutDashboard, to: '/admin' },
  { section: 'Management' },
  { label: 'User Directory', icon: Users, to: '/admin/users' },
  { label: 'Curriculum & Subjects', icon: BookOpen, to: '/admin/subjects' },
  { section: 'Analytics' },
  { label: 'Results Overview', icon: BarChart3, to: '/admin/results' },
];

const PROFESSOR_NAV = [
  { section: 'Overview' },
  { label: 'Dashboard', icon: LayoutDashboard, to: '/professor' },
  { section: 'Marks Management' },
  { label: 'Internal Marks', icon: ClipboardList, to: '/professor/internals' },
  { label: 'External Marks', icon: Award, to: '/professor/external' },
  { section: 'Reporting' },
  { label: 'Class Analysis', icon: BarChart3, to: '/professor/analysis' },
];

const STUDENT_NAV = [
  { section: 'Overview' },
  { label: 'Dashboard', icon: LayoutDashboard, to: '/student' },
  { section: 'Academics' },
  { label: 'My Grades', icon: GraduationCap, to: '/student/grades' },
  { label: 'Performance', icon: LineChart, to: '/student/performance' },
  { section: 'Account' },
  { label: 'Profile', icon: UserCircle, to: '/student/profile' },
];

const roleNavMap = { Admin: ADMIN_NAV, Professor: PROFESSOR_NAV, Student: STUDENT_NAV };

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = roleNavMap[user?.role] || [];

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <BookOpen size={19} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9375rem', color: '#0f172a', letterSpacing: '-0.02em' }}>
              ResultHub
            </p>
            <span
              style={{
                fontSize: '0.625rem',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: '9999px',
                background: '#eff6ff',
                color: '#1d4ed8',
                letterSpacing: '0.04em',
                border: '1px solid #bfdbfe',
              }}
            >
              ERP
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 6px rgba(16, 185, 129, 0.4)',
              }}
            />
            <p style={{ margin: 0, fontSize: '0.6875rem', color: '#64748b', fontWeight: 500 }}>
              Autumn 2024–25 Active
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item, idx) => {
          if (item.section) {
            return (
              <p key={idx} className="nav-section-label">
                {item.section}
              </p>
            );
          }
          const Icon = item.icon;
          const isActive =
            location.pathname === item.to ||
            (item.to !== '/admin' &&
              item.to !== '/professor' &&
              item.to !== '/student' &&
              location.pathname.startsWith(item.to));

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin' || item.to === '/professor' || item.to === '/student'}
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={16} className="nav-icon" />
              <span style={{ flex: 1 }}>{item.label}</span>
              {isActive && (
                <span
                  style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    background: '#2563eb',
                    boxShadow: '0 0 6px rgba(37, 99, 235, 0.4)',
                  }}
                />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="sidebar-footer">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px',
            borderRadius: '9px',
            marginBottom: '8px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 700,
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontWeight: 600,
                fontSize: '0.8125rem',
                color: '#0f172a',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user?.name}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <span
                style={{
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  border: '1px solid #dbeafe',
                }}
              >
                {user?.role}
              </span>
              <span
                style={{
                  fontSize: '0.6875rem',
                  color: '#64748b',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user?.identifier || user?.department}
              </span>
            </div>
          </div>
        </div>

        <button
          className="sidebar-signout-btn"
          onClick={handleLogout}
        >
          <LogOut size={15} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
};

export const Topbar = ({ title, subtitle }) => {
  const { user } = useAuth();

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

  return (
    <header className="topbar">
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: '1.125rem',
            fontWeight: 700,
            color: 'var(--text-main)',
            letterSpacing: '-0.015em',
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {subtitle}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            borderRadius: '9999px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            fontSize: '0.75rem',
            fontWeight: 500,
            color: '#475569',
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#10b981',
            }}
          />
          <span>AY 2024–25 · Verified</span>
        </div>

        <div style={{ textAlign: 'right' }}>
          <p
            style={{
              margin: 0,
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--text-main)',
            }}
          >
            {user?.name}
          </p>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {user?.identifier || user?.department} · {user?.role}
          </p>
        </div>

        <div
          className="avatar"
          style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            color: '#ffffff',
            fontSize: '0.8125rem',
            fontWeight: 600,
            boxShadow: '0 2px 5px rgba(15, 23, 42, 0.15)',
          }}
        >
          {initials}
        </div>
      </div>
    </header>
  );
};

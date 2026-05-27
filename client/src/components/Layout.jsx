import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, BookOpen, GraduationCap, ClipboardList,
  BarChart3, LineChart, UserCircle, LogOut, Award, Settings, ChevronRight
} from 'lucide-react';

const ADMIN_NAV = [
  { section: 'Overview' },
  { label: 'Dashboard', icon: LayoutDashboard, to: '/admin' },
  { section: 'Management' },
  { label: 'User Management', icon: Users, to: '/admin/users' },
  { label: 'Subject Mapping', icon: BookOpen, to: '/admin/subjects' },
  { section: 'Analytics' },
  { label: 'Results Overview', icon: BarChart3, to: '/admin/results' },
];

const PROFESSOR_NAV = [
  { section: 'Overview' },
  { label: 'Dashboard', icon: LayoutDashboard, to: '/professor' },
  { section: 'Work' },
  { label: 'Marks Entry', icon: ClipboardList, to: '/professor/marks' },
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

const roleBadgeColors = {
  Admin: { bg: '#e8f0fe', color: '#1a73e8' },
  Professor: { bg: '#e6f4ea', color: '#1e8e3e' },
  Student: { bg: '#fef0e6', color: '#e8710a' },
};

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = roleNavMap[user?.role] || [];
  const badge = roleBadgeColors[user?.role] || {};

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Award size={18} color="white" />
        </div>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
            ResultHub
          </p>
          <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
            CSE Department
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item, idx) => {
          if (item.section) {
            return (
              <p key={idx} className="nav-section-label">{item.section}</p>
            );
          }
          const Icon = item.icon;
          const isActive = location.pathname === item.to || 
            (item.to !== '/admin' && item.to !== '/professor' && item.to !== '/student' && 
             location.pathname.startsWith(item.to));

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin' || item.to === '/professor' || item.to === '/student'}
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} className="nav-icon" />
              <span style={{ flex: 1 }}>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="sidebar-footer">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 12px',
          borderRadius: '10px',
          marginBottom: '8px',
          background: 'var(--surface)',
        }}>
          <div
            className="avatar"
            style={{ background: badge.bg, color: badge.color, fontSize: '0.8125rem' }}
          >
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', 
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name}
            </p>
            <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
              {user?.identifier || user?.email}
            </p>
          </div>
          <span
            style={{
              fontSize: '0.6875rem',
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: '4px',
              background: badge.bg,
              color: badge.color,
            }}
          >
            {user?.role}
          </span>
        </div>
        <button className="nav-link" style={{ color: 'var(--danger)' }} onClick={handleLogout}>
          <LogOut size={16} />
          <span>Sign Out</span>
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
    .toUpperCase() || '?';

  const badge = roleBadgeColors[user?.role] || {};

  return (
    <header className="topbar">
      <div>
        <h1 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{subtitle}</p>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {user?.name}
          </p>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
            {user?.department} · {user?.role}
          </p>
        </div>
        <div className="avatar" style={{ background: badge.bg, color: badge.color }}>
          {initials}
        </div>
      </div>
    </header>
  );
};

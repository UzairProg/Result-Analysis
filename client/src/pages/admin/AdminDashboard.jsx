import { useState, useEffect } from 'react';
import { Sidebar, Topbar } from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { getUserStatsApi } from '../../api/api';
import { Users, GraduationCap, BookOpenCheck, BarChart3, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, XCircle, Award } from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, change, color, bg, subtitle }) => (
  <div className="stat-card animate-fade-in">
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <div className="stat-icon" style={{ background: bg }}>
        <Icon size={20} color={color} />
      </div>
      {change !== undefined && (
        <span className="stat-change" style={{ color: change >= 0 ? 'var(--success)' : 'var(--danger)' }}>
          {change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(change)}%
        </span>
      )}
    </div>
    <div>
      <div className="stat-value">{value ?? '—'}</div>
      <div className="stat-label">{label}</div>
      {subtitle && <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 2 }}>{subtitle}</div>}
    </div>
  </div>
);

const SemesterBar = ({ semester, count, max }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.8125rem' }}>
    <span style={{ width: 52, color: 'var(--text-secondary)', fontWeight: 500 }}>Sem {semester}</span>
    <div className="progress-bar" style={{ flex: 1 }}>
      <div
        className="progress-fill"
        style={{ width: `${max > 0 ? (count / max) * 100 : 0}%`, background: 'var(--primary)' }}
      />
    </div>
    <span style={{ width: 28, textAlign: 'right', color: 'var(--text-primary)', fontWeight: 600 }}>{count}</span>
  </div>
);

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getUserStatsApi();
        setStats(res.data.stats);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const semMax = stats?.semesterData?.reduce((max, s) => Math.max(max, s.count), 0) || 1;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="Admin Dashboard" subtitle="CSE Department · Result Management" />
        <main className="page-content">

          {/* Page Header */}
          <div className="page-header stagger">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 className="page-title">{greeting()}, {user?.name?.split(' ')[0]}</h2>
                <p className="page-subtitle">Department academic overview and evaluation metrics.</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <span className="badge badge-primary">AY 2025-26</span>
                <span className="badge badge-neutral">CSE Department</span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="loading-overlay">
              <div className="spinner spinner-dark" style={{ width: 32, height: 32, borderWidth: 3 }} />
              <span>Loading statistics...</span>
            </div>
          ) : (
            <>
              {/* KPI Stats Row */}
              <div className="grid grid-cols-4 stagger" style={{ gap: 16, marginBottom: 24 }}>
                <StatCard
                  icon={GraduationCap}
                  label="Total Students"
                  value={stats?.totalStudents ?? 0}
                  color="#1a73e8" bg="#e8f0fe"
                  subtitle="Active enrollments"
                />
                <StatCard
                  icon={BookOpenCheck}
                  label="Professors"
                  value={stats?.totalProfessors ?? 0}
                  color="#1e8e3e" bg="#e6f4ea"
                  subtitle="Active faculty"
                />
                <StatCard
                  icon={BarChart3}
                  label="Results Recorded"
                  value={stats?.totalResults ?? 0}
                  color="#e8710a" bg="#fef0e6"
                  subtitle="Across all subjects"
                />
                <StatCard
                  icon={Award}
                  label="Pass Rate"
                  value={`${stats?.passRate ?? 0}%`}
                  color="#8430ce" bg="#f3e8fd"
                  change={2.1}
                  subtitle="This academic year"
                />
              </div>

              {/* Second Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>

                {/* Result Status Breakdown */}
                <div className="card animate-fade-in">
                  <h3 style={{ margin: '0 0 20px', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Result Status Breakdown
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {[
                      { label: 'Pass', count: stats?.passCount ?? 0, color: 'var(--success)', bg: 'var(--success-light)', icon: CheckCircle },
                      { label: 'Fail', count: stats?.failCount ?? 0, color: 'var(--danger)', bg: 'var(--danger-light)', icon: XCircle },
                      { label: 'At-Risk', count: stats?.atRiskCount ?? 0, color: 'var(--at-risk)', bg: 'var(--at-risk-light)', icon: AlertTriangle },
                    ].map((item) => {
                      const Icon = item.icon;
                      const total = (stats?.totalResults || 1);
                      const pct = ((item.count / total) * 100).toFixed(0);
                      return (
                        <div key={item.label}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Icon size={15} color={item.color} />
                              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>{item.label}</span>
                            </div>
                            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: item.color }}>
                              {item.count} <span style={{ fontWeight: 400, color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>({pct}%)</span>
                            </span>
                          </div>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${pct}%`, background: item.color }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Students per Semester */}
                <div className="card animate-fade-in">
                  <h3 style={{ margin: '0 0 20px', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Student Distribution by Semester
                  </h3>
                  {stats?.semesterData?.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {Array.from({ length: 8 }, (_, i) => i + 1).map((sem) => {
                        const found = stats.semesterData.find((s) => s._id === sem);
                        return (
                          <SemesterBar key={sem} semester={sem} count={found?.count || 0} max={semMax} />
                        );
                      })}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <GraduationCap size={32} color="var(--text-tertiary)" />
                      <p style={{ margin: 0, fontSize: '0.875rem' }}>No student data yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Action Cards */}
              <div className="card animate-fade-in">
                <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Quick Actions
                </h3>
                <div className="grid grid-cols-3" style={{ gap: 12 }}>
                  {[
                    { label: 'Add New Student', icon: GraduationCap, color: '#1a73e8', bg: '#e8f0fe', to: '/admin/users' },
                    { label: 'Create Subject', icon: BookOpenCheck, color: '#1e8e3e', bg: '#e6f4ea', to: '/admin/subjects' },
                    { label: 'View All Results', icon: BarChart3, color: '#e8710a', bg: '#fef0e6', to: '/admin/results' },
                  ].map((action) => {
                    const Icon = action.icon;
                    return (
                      <a
                        key={action.label}
                        href={action.to}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                          border: '1.5px solid var(--border)', borderRadius: 10, cursor: 'pointer',
                          textDecoration: 'none', transition: 'all 0.2s ease', background: 'white'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = action.bg}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                      >
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: action.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon size={18} color={action.color} />
                        </div>
                        <span style={{ fontWeight: 500, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{action.label}</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

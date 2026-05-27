import { useState, useEffect } from 'react';
import { Sidebar, Topbar } from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { getProfessorSubjectsApi, getClassResultsApi } from '../../api/api';
import { BookOpen, Users, ClipboardList, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

const StatMini = ({ label, value, color }) => (
  <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
    <span style={{ fontSize: '1.375rem', fontWeight: 700, color: color || 'var(--text-primary)' }}>{value}</span>
    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
  </div>
);

export default function ProfessorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subjectAnalytics, setSubjectAnalytics] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getProfessorSubjectsApi();
        const subs = res.data.subjects || [];
        setSubjects(subs);
        const analyticsMap = {};
        await Promise.all(
          subs.map(async (sub) => {
            try {
              const r = await getClassResultsApi(sub._id);
              analyticsMap[sub._id] = r.data.analytics;
            } catch { analyticsMap[sub._id] = null; }
          })
        );
        setSubjectAnalytics(analyticsMap);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="Professor Dashboard" subtitle={`${user?.department} Department`} />
        <main className="page-content">
          <div className="page-header">
            <h2 className="page-title">Welcome, Prof. {user?.name?.split(' ')[0]} 👨‍🏫</h2>
            <p className="page-subtitle">Manage marks and track your class performance below.</p>
          </div>

          {loading ? (
            <div className="loading-overlay">
              <div className="spinner spinner-dark" style={{ width: 32, height: 32, borderWidth: 3 }} />
              <span>Loading your subjects...</span>
            </div>
          ) : subjects.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <BookOpen size={40} color="var(--text-tertiary)" />
                <p style={{ margin: 0, fontWeight: 500 }}>No subjects assigned yet</p>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>Contact your Admin to get subjects assigned.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 stagger" style={{ gap: 16, marginBottom: 24 }}>
                <div className="stat-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="stat-icon" style={{ background: '#e8f0fe' }}><BookOpen size={20} color="#1a73e8" /></div>
                    <div><div className="stat-value">{subjects.length}</div><div className="stat-label">Assigned Subjects</div></div>
                  </div>
                </div>
                <div className="stat-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="stat-icon" style={{ background: '#e6f4ea' }}><Users size={20} color="#1e8e3e" /></div>
                    <div>
                      <div className="stat-value">{Object.values(subjectAnalytics).reduce((a, v) => a + (v?.totalStudents || 0), 0)}</div>
                      <div className="stat-label">Total Students</div>
                    </div>
                  </div>
                </div>
                <div className="stat-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="stat-icon" style={{ background: '#fef0e6' }}><BarChart3 size={20} color="#e8710a" /></div>
                    <div>
                      <div className="stat-value">{(() => { const vals = Object.values(subjectAnalytics).filter(Boolean); if (!vals.length) return '—'; return (vals.reduce((a, v) => a + (v.classAverage || 0), 0) / vals.length).toFixed(1); })()}</div>
                      <div className="stat-label">Avg Class Score</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Visualization */}
              <div className="grid grid-cols-2" style={{ gap: 24, marginBottom: 32 }}>
                <div className="card animate-fade-in" style={{ padding: 24 }}>
                  <h3 style={{ margin: '0 0 20px', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Subject Averages</h3>
                  <div style={{ height: 250, width: '100%' }}>
                    {subjects.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={subjects.map(sub => ({ name: sub.subjectCode, avg: subjectAnalytics[sub._id]?.classAverage || 0 })).filter(d => d.avg > 0)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#80868b' }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#80868b' }} />
                          <RechartsTooltip cursor={{ fill: '#f1f3f4' }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                          <Bar dataKey="avg" name="Average Score" fill="#1a73e8" radius={[4, 4, 0, 0]} maxBarSize={50} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>No data</div>
                    )}
                  </div>
                </div>

                <div className="card animate-fade-in" style={{ padding: 24 }}>
                  <h3 style={{ margin: '0 0 20px', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Overall Grade Distribution</h3>
                  <div style={{ height: 250, width: '100%' }}>
                    {Object.keys(subjectAnalytics).length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Excellent', value: Object.values(subjectAnalytics).reduce((acc, a) => acc + ((a?.gradeDistribution?.['O'] || 0) + (a?.gradeDistribution?.['A+'] || 0) + (a?.gradeDistribution?.['A'] || 0)), 0), fill: '#1e8e3e' },
                              { name: 'Good', value: Object.values(subjectAnalytics).reduce((acc, a) => acc + ((a?.gradeDistribution?.['B+'] || 0) + (a?.gradeDistribution?.['B'] || 0) + (a?.gradeDistribution?.['C'] || 0) + (a?.gradeDistribution?.['D'] || 0)), 0), fill: '#1a73e8' },
                              { name: 'In-Progress', value: Object.values(subjectAnalytics).reduce((acc, a) => acc + (a?.inProgressCount || 0), 0), fill: '#f9ab00' },
                              { name: 'Failed', value: Object.values(subjectAnalytics).reduce((acc, a) => acc + (a?.failCount || 0), 0), fill: '#d93025' }
                            ].filter(d => d.value > 0)}
                            cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                          >
                            {/* Colors are handled by data.fill */}
                          </Pie>
                          <RechartsTooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>No data</div>
                    )}
                  </div>
                </div>
              </div>

              <h3 style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Your Subjects</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {subjects.map((sub, i) => {
                  const analytics = subjectAnalytics[sub._id];
                  return (
                    <div key={sub._id} className="card animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: '#e8f0fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <BookOpen size={22} color="#1a73e8" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                            <div>
                              <h4 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{sub.subjectName}</h4>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <span className="badge badge-primary">{sub.subjectCode}</span>
                                <span className="badge badge-neutral">Sem {sub.semester}</span>
                                <span className="badge badge-neutral">{sub.credits} Credits</span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/professor/marks', { state: { subjectId: sub._id } })}>
                                <ClipboardList size={14} /> Enter Marks
                              </button>
                              <button className="btn btn-primary btn-sm" onClick={() => navigate('/professor/analysis', { state: { subjectId: sub._id } })}>
                                <BarChart3 size={14} /> Analysis
                              </button>
                            </div>
                          </div>
                          {analytics ? (
                            <div className="grid grid-cols-4" style={{ gap: 10 }}>
                              <StatMini label="Students" value={analytics.totalStudents} />
                              <StatMini label="Passed" value={analytics.passCount} color="var(--success)" />
                              <StatMini label="Failed" value={analytics.failCount} color="var(--danger)" />
                              <StatMini label="Pass Rate" value={`${analytics.passRate}%`} color="var(--primary)" />
                            </div>
                          ) : (
                            <div style={{ padding: '12px', background: 'var(--surface)', borderRadius: 8, fontSize: '0.8125rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                              No results entered yet — click "Enter Marks" to begin
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

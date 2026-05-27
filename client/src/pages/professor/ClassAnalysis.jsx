import { useState, useEffect } from 'react';
import { Sidebar, Topbar } from '../../components/Layout';
import { getProfessorSubjectsApi, getClassResultsApi } from '../../api/api';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { ClipboardList, Award, TrendingUp } from 'lucide-react';

const COLORS = { Pass: '#1e8e3e', Fail: '#d93025', 'At-Risk': '#f9ab00' };

export default function ClassAnalysis() {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const res = await getProfessorSubjectsApi();
        setSubjects(res.data.subjects || []);
      } catch (err) { console.error(err); }
    };
    loadSubjects();
  }, []);

  useEffect(() => {
    const loadResults = async () => {
      if (!selectedSubject) return;
      setLoading(true);
      try {
        const res = await getClassResultsApi(selectedSubject);
        setResults(res.data.results || []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    loadResults();
  }, [selectedSubject]);

  const statusCounts = results.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, { Pass: 0, Fail: 0, 'At-Risk': 0 });
  
  const pieData = [
    { name: 'Pass', value: statusCounts.Pass },
    { name: 'At-Risk', value: statusCounts['At-Risk'] },
    { name: 'Fail', value: statusCounts.Fail }
  ].filter(d => d.value > 0);

  const toppers = [...results].sort((a, b) => b.totalMarks - a.totalMarks).slice(0, 5);

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="Class Analysis" subtitle="Performance insights for your subjects" />
        <main className="page-content">
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 className="page-title">Subject Analytics</h2>
              <p className="page-subtitle">Select a subject to view performance distribution and toppers.</p>
            </div>
            <div>
              <select className="form-select" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
                <option value="">Select a subject...</option>
                {subjects.map(s => <option key={s._id} value={s._id}>{s.subjectName} (Sem {s.semester})</option>)}
              </select>
            </div>
          </div>

          {loading ? (
             <div className="loading-overlay">
               <div className="spinner spinner-dark" />
               <span>Generating report...</span>
             </div>
          ) : !selectedSubject ? (
            <div className="card">
              <div className="empty-state">
                <ClipboardList size={40} color="var(--text-tertiary)" />
                <p style={{ margin: 0, fontWeight: 500 }}>No subject selected</p>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>Select a subject above to view analytics.</p>
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <TrendingUp size={40} color="var(--text-tertiary)" />
                <p style={{ margin: 0, fontWeight: 500 }}>No results found</p>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>Marks have not been entered for this subject yet.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 stagger" style={{ gap: 20 }}>
              <div className="card">
                <h3 style={{ margin: '0 0 20px', fontSize: '1rem', fontWeight: 600 }}>Grade Distribution</h3>
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={2} dataKey="value">
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card">
                <h3 style={{ margin: '0 0 20px', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Award size={18} color="#1a73e8" /> Class Toppers (Top 5)
                </h3>
                <div className="table-wrapper">
                  <table style={{ minWidth: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ width: 40, textAlign: 'center' }}>Rank</th>
                        <th>Student</th>
                        <th style={{ textAlign: 'center' }}>Total /100</th>
                        <th style={{ textAlign: 'center' }}>Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {toppers.map((t, i) => (
                        <tr key={t._id}>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: i === 0 ? '#e8710a' : 'inherit' }}>#{i+1}</td>
                          <td>
                            <div style={{ fontWeight: 500 }}>{t.studentId?.name || 'Unknown'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{t.studentId?.identifier || '—'}</div>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>{t.totalMarks}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: '#1a73e8' }}>{t.grade}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

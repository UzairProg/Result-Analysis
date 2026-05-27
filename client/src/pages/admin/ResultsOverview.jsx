import { useState, useEffect } from 'react';
import { Sidebar, Topbar } from '../../components/Layout';
import { getSemesterResultsApi, getSubjectsApi } from '../../api/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Award, TrendingUp, AlertTriangle } from 'lucide-react';

const COLORS = { Excellent: '#1e8e3e', Good: '#1a73e8', 'In-Progress': '#f9ab00', Fail: '#d93025' };
const STATUS_COLORS = { Completed: '#1e8e3e', 'In-Progress': '#1a73e8' };

export default function ResultsOverview() {
  const [selectedSem, setSelectedSem] = useState(1);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await getSemesterResultsApi(selectedSem);
        setResults(res.data.results || []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, [selectedSem]);

  // Compute Donut Chart Data (Grade Distribution Ratio)
  const gradeCounts = results.reduce((acc, r) => {
    const g = r.grade;
    if (g === 'O' || g === 'A+' || g === 'A') acc.Excellent++;
    else if (g === 'B+' || g === 'B' || g === 'C' || g === 'D') acc.Good++;
    else if (r.status === 'In-Progress') acc['In-Progress']++;
    else if (r.status === 'Failed') acc.Fail++;
    return acc;
  }, { Excellent: 0, Good: 0, 'In-Progress': 0, Fail: 0 });

  const pieData = [
    { name: 'Excellent', value: gradeCounts.Excellent },
    { name: 'Good', value: gradeCounts.Good },
    { name: 'In-Progress', value: gradeCounts['In-Progress'] },
    { name: 'Fail', value: gradeCounts.Fail }
  ].filter(d => d.value > 0);

  // Compute Bar Chart Data (Subject-wise Averages & Progress)
  const subjectMap = {};
  results.forEach(r => {
    const subName = r.subjectId?.subjectName || 'Unknown';
    if (!subjectMap[subName]) subjectMap[subName] = { name: subName, totalMarks: 0, count: 0, completed: 0, inProgress: 0 };

    subjectMap[subName].count += 1;
    if (r.status === 'In-Progress') {
      subjectMap[subName].inProgress += 1;
    } else {
      subjectMap[subName].completed += 1;
      subjectMap[subName].totalMarks += r.totalMarks;
    }
  });

  const barData = Object.values(subjectMap).map(s => ({
    name: s.name,
    avg: s.completed > 0 ? Number((s.totalMarks / s.completed).toFixed(1)) : 0,
    Completed: s.completed,
    'In-Progress': s.inProgress
  }));

  // Compute Toppers List (Top 5 by SGPA approximation for the semester)
  const studentMap = {};
  results.forEach(r => {
    const sId = r.studentId?._id;
    if (!sId) return;
    if (!studentMap[sId]) {
      studentMap[sId] = {
        name: r.studentId.name,
        prn: r.studentId.identifier,
        totalGradePoints: 0,
        totalCredits: 0
      };
    }
    const credits = r.subjectId?.credits || 3;
    studentMap[sId].totalGradePoints += (r.gradePoints * credits);
    studentMap[sId].totalCredits += credits;
  });

  const toppers = Object.values(studentMap).map(s => ({
    ...s,
    sgpa: s.totalCredits > 0 ? Number((s.totalGradePoints / s.totalCredits).toFixed(2)) : 0
  })).sort((a, b) => b.sgpa - a.sgpa).slice(0, 5);

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="Results Overview" subtitle="Department wide analytics and reporting" />
        <main className="page-content">
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 className="page-title">CSE Analytics Dashboard</h2>
              <p className="page-subtitle">Track department performance, subject difficulty, and toppers.</p>
            </div>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                <button
                  key={s}
                  onClick={() => setSelectedSem(s)}
                  className={`btn ${s === selectedSem ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                >
                  Sem {s}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="loading-overlay">
              <div className="spinner spinner-dark" />
              <span>Generating analytics...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <AlertTriangle size={40} color="var(--warning)" />
                <p style={{ margin: 0, fontWeight: 500 }}>No Data Available</p>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>No results have been entered for Semester {selectedSem} yet.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 stagger" style={{ gap: 20, marginBottom: 20 }}>
                {/* Donut Chart */}
                <div className="card">
                  <h3 style={{ margin: '0 0 20px', fontSize: '1rem', fontWeight: 600 }}>Overall Performance Ratio</h3>
                  <div style={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={2} dataKey="value">
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Top 5 Toppers */}
                <div className="card">
                  <h3 style={{ margin: '0 0 20px', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Award size={18} color="#1a73e8" /> Top 5 Students (Sem {selectedSem})
                  </h3>
                  <div className="table-wrapper">
                    <table style={{ minWidth: '100%' }}>
                      <thead>
                        <tr>
                          <th style={{ width: 40, textAlign: 'center' }}>Rank</th>
                          <th>Student</th>
                          <th style={{ textAlign: 'center' }}>SGPA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {toppers.map((t, i) => (
                          <tr key={t.prn}>
                            <td style={{ textAlign: 'center', fontWeight: 700, color: i === 0 ? '#e8710a' : 'inherit' }}>#{i + 1}</td>
                            <td>
                              <div style={{ fontWeight: 500 }}>{t.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{t.prn}</div>
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 700, fontSize: '1.1rem', color: '#1a73e8' }}>{t.sgpa.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Bar Charts */}
              <div className="grid grid-cols-2" style={{ gap: 20, marginBottom: 20 }}>
                <div className="card animate-fade-in">
                  <h3 style={{ margin: '0 0 20px', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TrendingUp size={18} color="#1e8e3e" /> Subject-wise Average Scores
                  </h3>
                  <div style={{ height: 350 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 50 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8eaed" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#5f6368' }} angle={-25} textAnchor="end" />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#5f6368' }} domain={[0, 100]} />
                        <RechartsTooltip cursor={{ fill: '#f8f9fa' }} contentStyle={{ borderRadius: 8, border: '1px solid #e8eaed', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }} />
                        <Bar dataKey="avg" fill="#1e8e3e" radius={[4, 4, 0, 0]} barSize={40} name="Average Marks" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="card animate-fade-in">
                  <h3 style={{ margin: '0 0 20px', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Award size={18} color="#1a73e8" /> Progress Tracker
                  </h3>
                  <div style={{ height: 350 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 50 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8eaed" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#5f6368' }} angle={-25} textAnchor="end" />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#5f6368' }} />
                        <RechartsTooltip cursor={{ fill: '#f8f9fa' }} contentStyle={{ borderRadius: 8, border: '1px solid #e8eaed', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }} />
                        <Legend verticalAlign="top" height={36} />
                        <Bar dataKey="Completed" stackId="a" fill={STATUS_COLORS['Completed']} barSize={40} />
                        <Bar dataKey="In-Progress" stackId="a" fill={STATUS_COLORS['In-Progress']} radius={[4, 4, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

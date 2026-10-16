import { useState, useEffect } from 'react';
import { Sidebar, Topbar } from '../../components/Layout';
import { getProfessorSubjectsApi, getClassResultsApi } from '../../api/api';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  ClipboardList,
  Award,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Download,
  BookOpen,
  Users,
  ShieldAlert,
} from 'lucide-react';
import * as XLSX from 'xlsx';

const STATUS_COLORS = {
  Passed: '#1e8e3e',
  Failed: '#d93025',
  'In-Progress': '#1a73e8',
  'At-Risk': '#e8710a',
};

const GRADE_COLORS = {
  O: '#1e8e3e',
  'A+': '#2ba44e',
  A: '#1a73e8',
  'B+': '#4285f4',
  B: '#f9ab00',
  C: '#e8710a',
  D: '#80868b',
  F: '#d93025',
};

export default function ClassAnalysis() {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [results, setResults] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const res = await getProfessorSubjectsApi();
        const subs = res.data.subjects || [];
        setSubjects(subs);
        if (subs.length > 0) setSelectedSubjectId(subs[0]._id);
      } catch (err) {
        console.error('Error fetching subjects:', err);
      }
    };
    loadSubjects();
  }, []);

  useEffect(() => {
    const loadResults = async () => {
      if (!selectedSubjectId) return;
      setLoading(true);
      try {
        const res = await getClassResultsApi(selectedSubjectId);
        setResults(res.data.results || []);
        setAnalytics(res.data.analytics || null);
      } catch (err) {
        console.error('Error fetching class results:', err);
      } finally {
        setLoading(false);
      }
    };
    loadResults();
  }, [selectedSubjectId]);

  const selectedSubject = subjects.find((s) => s._id === selectedSubjectId);

  // Status breakdown
  const statusCounts = results.reduce(
    (acc, r) => {
      if (r.status === 'Passed') acc.Passed++;
      else if (r.status === 'Failed') acc.Failed++;
      else acc['In-Progress']++;

      if (r.internalTotal < 20) acc['At-Risk']++;
      return acc;
    },
    { Passed: 0, Failed: 0, 'In-Progress': 0, 'At-Risk': 0 }
  );

  const statusPieData = [
    { name: 'Passed', value: statusCounts.Passed },
    { name: 'Failed', value: statusCounts.Failed },
    { name: 'In-Progress', value: statusCounts['In-Progress'] },
  ].filter((d) => d.value > 0);

  // Grade Distribution
  const gradeOrder = ['O', 'A+', 'A', 'B+', 'B', 'C', 'D', 'F'];
  const gradeDistributionData = gradeOrder
    .map((g) => ({
      grade: g,
      count: results.filter((r) => r.grade === g).length,
    }))
    .filter((d) => d.count > 0);

  // Assessment Component Averages for Bar Chart
  const componentAverages = [
    { name: 'CA1 (/10)', avg: analytics?.ca1Average || 0, max: 10 },
    { name: 'MSE (/20)', avg: analytics?.mseAverage || 0, max: 20 },
    { name: 'CA2 (/10)', avg: analytics?.ca2Average || 0, max: 10 },
    { name: 'Internals (/40)', avg: analytics?.internalAverage || 0, max: 40 },
    { name: 'End-Sem (/60)', avg: analytics?.endSemAverage || 0, max: 60 },
  ];

  // At-Risk Students list
  const atRiskStudents = results.filter((r) => r.internalTotal < 20 || (r.endSem !== null && r.endSem < 20));

  // Toppers list
  const toppers = [...results].sort((a, b) => b.totalMarks - a.totalMarks).slice(0, 5);

  const handleExportReport = () => {
    if (results.length === 0) return;

    const data = results.map((r, i) => ({
      Rank: i + 1,
      PRN: r.studentId?.identifier || '—',
      Name: r.studentId?.name || '—',
      'CA1 (/10)': r.ca1 ?? '—',
      'MSE (/20)': r.mse ?? '—',
      'CA2 (/10)': r.ca2 ?? '—',
      'Internals Total (/40)': r.internalTotal ?? 0,
      'End-Sem (/60)': r.endSem ?? '—',
      'Total Marks (/100)': r.totalMarks ?? 0,
      Grade: r.grade || '—',
      Status: r.status || 'In-Progress',
      Remarks: r.remarks || '—',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Class_Analysis');
    XLSX.writeFile(wb, `${selectedSubject?.subjectCode || 'Subject'}_Class_Report.xlsx`);
  };

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="Class Analysis" subtitle="Performance diagnostics and grade distribution" />

        <main className="page-content">
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div>
              <h2 className="page-title">Subject Performance</h2>
              <p className="page-subtitle">
                Grade distributions, component averages, and students requiring academic support.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                className="form-select"
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                style={{ minWidth: 240 }}
              >
                {subjects.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.subjectName} ({s.subjectCode}) · Sem {s.semester}
                  </option>
                ))}
              </select>

              {results.length > 0 && (
                <button className="btn btn-secondary btn-sm" onClick={handleExportReport}>
                  <Download size={14} /> Export Report
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="loading-overlay">
              <div className="spinner spinner-dark" />
              <span>Compiling performance analytics...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <TrendingUp size={40} color="var(--text-tertiary)" />
                <p style={{ margin: 0, fontWeight: 600 }}>No Academic Results Found</p>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                  Marks have not been recorded for this subject yet. Go to Internal or External marks entry to add scores.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* KEY STATS ROW */}
              <div className="grid grid-cols-4 stagger" style={{ gap: 16, marginBottom: 24 }}>
                <div className="stat-card">
                  <span className="stat-label">Total Enrolled</span>
                  <div className="stat-value" style={{ fontSize: '1.5rem' }}>
                    {results.length} <span style={{ fontSize: '0.8125rem', fontWeight: 400 }}>Students</span>
                  </div>
                </div>

                <div className="stat-card">
                  <span className="stat-label">Pass Rate</span>
                  <div className="stat-value" style={{ fontSize: '1.5rem', color: '#1e8e3e' }}>
                    {analytics?.passRate || 0}%
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {statusCounts.Passed} Passed · {statusCounts.Failed} Failed
                  </span>
                </div>

                <div className="stat-card">
                  <span className="stat-label">Average Score</span>
                  <div className="stat-value" style={{ fontSize: '1.5rem', color: '#1a73e8' }}>
                    {analytics?.classAverage || 0}
                    <span style={{ fontSize: '0.8125rem', fontWeight: 400, color: 'var(--text-tertiary)' }}>
                      {' '}/ 100
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Internals Avg: {analytics?.internalAverage || 0} / 40
                  </span>
                </div>

                <div className="stat-card">
                  <span className="stat-label">At-Risk Students</span>
                  <div className="stat-value" style={{ fontSize: '1.5rem', color: '#e8710a' }}>
                    {atRiskStudents.length}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Internals &lt; 20 or EndSem &lt; 20
                  </span>
                </div>
              </div>

              {/* CHARTS ROW */}
              <div className="grid grid-cols-2 stagger" style={{ gap: 20, marginBottom: 24 }}>
                {/* Component-wise Averages Bar Chart */}
                <div className="card">
                  <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 700 }}>
                    Assessment Component Breakdown
                  </h3>
                  <div style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={componentAverages} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" fontSize={11} />
                        <YAxis fontSize={11} />
                        <RechartsTooltip />
                        <Bar dataKey="avg" name="Class Average" fill="#1a73e8" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Status Breakdown Pie Chart */}
                <div className="card">
                  <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 700 }}>
                    Passing & Evaluation Status
                  </h3>
                  <div style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {statusPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#80868b'} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* TOPPERS & AT-RISK TABLES ROW */}
              <div className="grid grid-cols-2 stagger" style={{ gap: 20, marginBottom: 24 }}>
                {/* CLASS TOPPERS */}
                <div className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <Award size={20} color="#e8710a" />
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                      Class Toppers (Top 5)
                    </h3>
                  </div>

                  <div className="table-wrapper">
                    <table style={{ minWidth: '100%' }}>
                      <thead>
                        <tr>
                          <th style={{ width: 45, textAlign: 'center' }}>Rank</th>
                          <th>Student</th>
                          <th style={{ textAlign: 'center' }}>Internals (/40)</th>
                          <th style={{ textAlign: 'center' }}>EndSem (/60)</th>
                          <th style={{ textAlign: 'center' }}>Total (/100)</th>
                          <th style={{ textAlign: 'center' }}>Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {toppers.map((t, i) => (
                          <tr key={t._id}>
                            <td style={{ textAlign: 'center', fontWeight: 700, color: i === 0 ? '#e8710a' : 'inherit' }}>
                              #{i + 1}
                            </td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{t.studentId?.name || 'Unknown'}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                {t.studentId?.identifier || '—'}
                              </div>
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 600 }}>{t.internalTotal ?? 0}</td>
                            <td style={{ textAlign: 'center', fontWeight: 600 }}>{t.endSem ?? '—'}</td>
                            <td style={{ textAlign: 'center', fontWeight: 700, color: '#1e8e3e' }}>
                              {t.totalMarks}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span
                                style={{
                                  fontWeight: 800,
                                  color: GRADE_COLORS[t.grade] || '#1a73e8',
                                }}
                              >
                                {t.grade}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* AT-RISK STUDENTS WATCHLIST */}
                <div className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <ShieldAlert size={20} color="#d93025" />
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#d93025' }}>
                      At-Risk Students Watchlist ({atRiskStudents.length})
                    </h3>
                  </div>

                  {atRiskStudents.length === 0 ? (
                    <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                      <CheckCircle size={32} color="#1e8e3e" style={{ margin: '0 auto 8px' }} />
                      <p style={{ margin: 0, fontWeight: 600, color: '#1e8e3e' }}>Great News!</p>
                      <p style={{ margin: 0, fontSize: '0.8125rem' }}>
                        No students are currently at-risk in this subject.
                      </p>
                    </div>
                  ) : (
                    <div className="table-wrapper">
                      <table style={{ minWidth: '100%' }}>
                        <thead>
                          <tr>
                            <th>Student</th>
                            <th style={{ textAlign: 'center' }}>Internals (/40)</th>
                            <th style={{ textAlign: 'center' }}>EndSem (/60)</th>
                            <th style={{ textAlign: 'center' }}>Status</th>
                            <th>Passing Requirement</th>
                          </tr>
                        </thead>
                        <tbody>
                          {atRiskStudents.map((st) => {
                            const internal = st.internalTotal ?? 0;
                            const minNeeded = Math.max(20, 40 - internal);

                            return (
                              <tr key={st._id} style={{ background: 'var(--danger-light)' }}>
                                <td>
                                  <div style={{ fontWeight: 600 }}>{st.studentId?.name || '—'}</div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                    {st.studentId?.identifier || '—'}
                                  </div>
                                </td>
                                <td style={{ textAlign: 'center', fontWeight: 700, color: internal < 20 ? '#d93025' : 'inherit' }}>
                                  {internal}
                                </td>
                                <td style={{ textAlign: 'center', fontWeight: 700, color: st.endSem !== null && st.endSem < 20 ? '#d93025' : 'inherit' }}>
                                  {st.endSem ?? 'Pending'}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  {st.status === 'Failed' ? (
                                    <span className="badge badge-danger">Failed</span>
                                  ) : (
                                    <span className="badge badge-warning" style={{ background: '#fef0e6', color: '#e8710a' }}>
                                      At-Risk
                                    </span>
                                  )}
                                </td>
                                <td style={{ fontSize: '0.75rem', color: '#b06000' }}>
                                  {st.endSem === null
                                    ? `Needs at least ${minNeeded}/60 in EndSem`
                                    : st.endSem < 20
                                    ? 'EndSem score < 20 (Mandatory threshold failed)'
                                    : 'Aggregate score < 40'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

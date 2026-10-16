import { useState, useEffect } from 'react';
import { Sidebar, Topbar } from '../../components/Layout';
import { getStudentResultsApi, getSubjectsApi } from '../../api/api';
import { GraduationCap, BookOpen, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const gradeColor = (grade) => {
  const map = { O: '#1a73e8', 'A+': '#1e8e3e', A: '#1e8e3e', 'B+': '#e8710a', B: '#f9ab00', C: '#f9ab00', D: '#80868b', F: '#d93025' };
  return map[grade] || '#80868b';
};

const statusBadge = (status) => {
  if (status === 'Passed') return <span className="badge badge-success"><CheckCircle size={10} /> Passed</span>;
  if (status === 'Failed') return <span className="badge badge-danger"><XCircle size={10} /> Failed</span>;
  return <span className="badge badge-neutral" style={{ background: '#e8f0fe', color: '#1a73e8', fontWeight: 600 }}>In-Progress</span>;
};

export default function MyGrades() {
  const { user } = useAuth();
  const [selectedSem, setSelectedSem] = useState(user?.currentSemester || 1);
  const [results, setResults] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [res, subRes] = await Promise.all([
          getStudentResultsApi(user._id),
          getSubjectsApi({ semester: selectedSem })
        ]);

        const allResults = res.data.results || [];
        const semResults = allResults.filter(r => r.semester === selectedSem);
        setResults(semResults);
        setSubjects(subRes.data.subjects || []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    if (user?._id) load();
  }, [selectedSem, user]);

  const syncResults = subjects.map(sub => {
    const result = results.find(r => r.subjectId?._id === sub._id);
    if (result) return result;
    return {
      _id: `temp-${sub._id}`,
      subjectId: sub,
      ca1: null, mse: null, ca2: null, endSem: null, totalMarks: 0, grade: '—', status: 'In-Progress', remarks: '—'
    };
  });

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="My Grades" subtitle="Complete academic record" />
        <main className="page-content">
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 className="page-title">My Grades</h2>
              <p className="page-subtitle">Full marksheet across all semesters · PRN: {user?.identifier || '—'}</p>
            </div>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                <button
                  key={s}
                  onClick={() => setSelectedSem(s)}
                  className={`btn ${s === selectedSem ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                >
                  S{s}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="loading-overlay">
              <div className="spinner spinner-dark" />
              <span>Loading semester {selectedSem} grades...</span>
            </div>
          ) : syncResults.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <GraduationCap size={40} color="var(--text-tertiary)" />
                <p style={{ margin: 0, fontWeight: 500 }}>No subjects for Semester {selectedSem}</p>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>Subjects have not been mapped for this semester yet.</p>
              </div>
            </div>
          ) : (
            <div className="card animate-fade-in">
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Code</th>
                      <th style={{ textAlign: 'center' }}>Credits</th>
                      <th style={{ textAlign: 'center' }}>CA1 /10</th>
                      <th style={{ textAlign: 'center' }}>MSE /20</th>
                      <th style={{ textAlign: 'center' }}>CA2 /10</th>
                      <th style={{ textAlign: 'center' }}>Internals /40</th>
                      <th style={{ textAlign: 'center' }}>EndSem /60</th>
                      <th style={{ textAlign: 'center' }}>Total /100</th>
                      <th style={{ textAlign: 'center' }}>Grade</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                      <th>Feedback</th>
                    </tr>
                  </thead>
                  <tbody>
                    {syncResults.map((r) => (
                      <tr key={r._id}>
                        <td style={{ fontWeight: 500 }}>{r.subjectId?.subjectName || '—'}</td>
                        <td><span className="badge badge-neutral">{r.subjectId?.subjectCode || '—'}</span></td>
                        <td style={{ textAlign: 'center' }}>{r.subjectId?.credits || '—'}</td>
                        <td style={{ textAlign: 'center', color: r.status === 'In-Progress' && r.ca1 === null ? 'var(--text-tertiary)' : 'inherit' }}>{r.ca1 === null ? '—' : r.ca1}</td>
                        <td style={{ textAlign: 'center', color: r.status === 'In-Progress' && r.mse === null ? 'var(--text-tertiary)' : 'inherit' }}>{r.mse === null ? '—' : r.mse}</td>
                        <td style={{ textAlign: 'center', color: r.status === 'In-Progress' && r.ca2 === null ? 'var(--text-tertiary)' : 'inherit' }}>{r.ca2 === null ? '—' : r.ca2}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontWeight: 700, color: (r.internalTotal || 0) < 20 && (r.ca1 !== null || r.mse !== null || r.ca2 !== null) ? 'var(--danger)' : '#1a73e8' }}>
                            {(r.ca1 !== null || r.mse !== null || r.ca2 !== null) ? (r.internalTotal ?? 0) : '—'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', color: r.status === 'In-Progress' && r.endSem === null ? 'var(--text-tertiary)' : 'inherit' }}>
                          <span style={{ fontWeight: 600, color: r.endSem !== null && r.endSem < 20 ? 'var(--danger)' : 'inherit' }}>{r.endSem === null ? '—' : r.endSem}</span>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: r.status === 'In-Progress' && r.totalMarks === 0 ? 'var(--text-tertiary)' : 'inherit' }}>{r.totalMarks}</td>
                        <td style={{ textAlign: 'center' }}>
                          {r.status === 'In-Progress' && r.grade === '—' ? <span style={{ color: 'var(--text-tertiary)' }}>—</span> : <span style={{ fontWeight: 700, color: gradeColor(r.grade), fontSize: '1rem' }}>{r.grade}</span>}
                        </td>
                        <td style={{ textAlign: 'center' }}>{statusBadge(r.status)}</td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{r.remarks || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

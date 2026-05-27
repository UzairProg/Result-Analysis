import { useState, useEffect } from 'react';
import { Sidebar, Topbar } from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { getStudentResultsApi, getSubjectsApi } from '../../api/api';
import { GraduationCap, BookOpen, TrendingUp, Award, AlertTriangle, CheckCircle, XCircle, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

const gradeColor = (grade) => {
  const map = { O: '#1a73e8', 'A+': '#1e8e3e', A: '#1e8e3e', 'B+': '#e8710a', B: '#f9ab00', C: '#f9ab00', D: '#80868b', F: '#d93025' };
  return map[grade] || '#80868b';
};

const statusBadge = (status) => {
  if (status === 'Passed') return <span className="badge badge-success"><CheckCircle size={10} /> Passed</span>;
  if (status === 'Failed') return <span className="badge badge-danger"><XCircle size={10} /> Failed</span>;
  return <span className="badge badge-neutral" style={{ background: '#e8f0fe', color: '#1a73e8', fontWeight: 600 }}>In-Progress</span>;
};

export default function StudentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [res, subRes] = await Promise.all([
          getStudentResultsApi(user._id),
          getSubjectsApi({ semester: user.currentSemester })
        ]);
        setData(res.data);
        setSubjects(subRes.data.subjects || []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    if (user?._id) load();
  }, [user]);

  const latestSemResults = data?.results?.filter(r => r.semester === user?.currentSemester) || [];

  // Semester-Sync: Map all subjects to results
  const syncResults = subjects.map(sub => {
    const result = latestSemResults.find(r => r.subjectId?._id === sub._id);
    if (result) return result;
    return {
      _id: `temp-${sub._id}`,
      subjectId: sub,
      ca1: null, mse: null, ca2: null, endSem: null, totalMarks: 0, grade: '—', status: 'In-Progress', remarks: '—'
    };
  });

  const cgpa = data?.cgpa || 0;
  const currentSGPA = data?.sgpaData?.find(s => s.semester === user?.currentSemester)?.sgpa || 0;

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("ResultHub - Provisional Marksheet", 14, 22);
    doc.setFontSize(11);
    doc.text(`Name: ${user?.name}`, 14, 32);
    doc.text(`PRN: ${user?.identifier || 'N/A'}`, 14, 38);
    doc.text(`Semester: ${user?.currentSemester}`, 14, 44);

    const tableColumn = ["Subject", "Code", "CA1", "MSE", "CA2", "EndSem", "Total", "Grade", "Status"];
    const tableRows = [];

    syncResults.forEach(r => {
      const row = [
        r.subjectId?.subjectName,
        r.subjectId?.subjectCode,
        r.status === 'In-Progress' && r.ca1 === null ? '—' : r.ca1,
        r.status === 'In-Progress' && r.mse === null ? '—' : r.mse,
        r.status === 'In-Progress' && r.ca2 === null ? '—' : r.ca2,
        r.status === 'In-Progress' && r.endSem === null ? '—' : r.endSem,
        r.status === 'In-Progress' && r.totalMarks === 0 ? '—' : r.totalMarks,
        r.grade,
        r.status
      ];
      tableRows.push(row);
    });

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 50,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [26, 115, 232] }
    });

    doc.text(`SGPA: ${currentSGPA.toFixed(2)}`, 14, doc.lastAutoTable.finalY + 10);
    doc.text(`CGPA: ${cgpa.toFixed(2)}`, 14, doc.lastAutoTable.finalY + 16);

    doc.save(`Marksheet_${user?.identifier || 'Student'}_Sem${user?.currentSemester}.pdf`);
  };

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="Student Dashboard" subtitle={`Semester ${user?.currentSemester || '—'} · ${user?.department}`} />
        <main className="page-content">
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 className="page-title">Welcome, {user?.name?.split(' ')[0]} 🎓</h2>
              <p className="page-subtitle">PRN: {user?.identifier || '—'} · {user?.department} · Semester {user?.currentSemester || '—'}</p>
            </div>
            <button className="btn btn-secondary" onClick={downloadPDF}>
              <Download size={16} /> Download PDF
            </button>
          </div>

          {loading ? (
            <div className="loading-overlay">
              <div className="spinner spinner-dark" style={{ width: 32, height: 32, borderWidth: 3 }} />
              <span>Loading your results...</span>
            </div>
          ) : (
            <>
              {/* CGPA / SGPA Cards */}
              <div className="grid grid-cols-4 stagger" style={{ gap: 16, marginBottom: 24 }}>
                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #1a73e8 0%, #4285f4 100%)', border: 'none', color: 'white' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Award size={22} color="white" />
                    </div>
                    <div>
                      <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{cgpa.toFixed(2)}</div>
                      <div style={{ fontSize: '0.8125rem', opacity: 0.85 }}>CGPA</div>
                    </div>
                  </div>
                </div>
                <div className="stat-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="stat-icon" style={{ background: '#e6f4ea' }}><TrendingUp size={20} color="#1e8e3e" /></div>
                    <div>
                      <div className="stat-value">{currentSGPA.toFixed ? currentSGPA.toFixed(2) : currentSGPA}</div>
                      <div className="stat-label">Current SGPA</div>
                    </div>
                  </div>
                </div>
                <div className="stat-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="stat-icon" style={{ background: '#e8f0fe' }}><BookOpen size={20} color="#1a73e8" /></div>
                    <div>
                      <div className="stat-value">{syncResults.length || 0}</div>
                      <div className="stat-label">Subjects Enrolled</div>
                    </div>
                  </div>
                </div>
                <div className="stat-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="stat-icon" style={{ background: '#e6f4ea' }}><GraduationCap size={20} color="#1e8e3e" /></div>
                    <div>
                      <div className="stat-value">Sem {user?.currentSemester || '—'}</div>
                      <div className="stat-label">Current Semester</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Semester Results */}
              <div className="card animate-fade-in" style={{ marginBottom: 20 }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Semester {user?.currentSemester} Results
                </h3>
                {syncResults.length === 0 ? (
                  <div className="empty-state">
                    <BookOpen size={32} color="var(--text-tertiary)" />
                    <p style={{ margin: 0 }}>No subjects found for current semester</p>
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Subject</th>
                          <th>Code</th>
                          <th style={{ textAlign: 'center' }}>CA1 /10</th>
                          <th style={{ textAlign: 'center' }}>MSE /20</th>
                          <th style={{ textAlign: 'center' }}>CA2 /10</th>
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
                            <td style={{ textAlign: 'center', color: r.status === 'In-Progress' ? 'var(--text-tertiary)' : 'inherit' }}>{r.status === 'In-Progress' && r.ca1 === null ? '—' : r.ca1}</td>
                            <td style={{ textAlign: 'center', color: r.status === 'In-Progress' ? 'var(--text-tertiary)' : 'inherit' }}>{r.status === 'In-Progress' && r.mse === null ? '—' : r.mse}</td>
                            <td style={{ textAlign: 'center', color: r.status === 'In-Progress' ? 'var(--text-tertiary)' : 'inherit' }}>{r.status === 'In-Progress' && r.ca2 === null ? '—' : r.ca2}</td>
                            <td style={{ textAlign: 'center', color: r.status === 'In-Progress' ? 'var(--text-tertiary)' : 'inherit' }}>
                              <span style={{ fontWeight: 600, color: r.endSem !== null && r.endSem < 20 ? 'var(--danger)' : 'inherit' }}>{r.status === 'In-Progress' && r.endSem === null ? '—' : r.endSem}</span>
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
                )}
              </div>

              {/* SGPA Trend Chart */}
              {data?.sgpaData?.length > 0 && (
                <div className="card animate-fade-in" style={{ padding: 24 }}>
                  <h3 style={{ margin: '0 0 20px', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>SGPA Trend Across Semesters</h3>
                  <div style={{ height: 300, width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.sgpaData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                        <XAxis dataKey="semester" tickFormatter={(sem) => `Sem ${sem}`} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#80868b' }} dy={10} />
                        <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#80868b' }} dx={-10} />
                        <RechartsTooltip
                          contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                          formatter={(value) => [`${value.toFixed(2)}`, 'SGPA']}
                          labelFormatter={(label) => `Semester ${label}`}
                        />
                        <Line
                          type="monotone"
                          dataKey="sgpa"
                          stroke="#1a73e8"
                          strokeWidth={3}
                          dot={{ r: 5, fill: '#1a73e8', strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 7 }}
                          animationDuration={1500}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

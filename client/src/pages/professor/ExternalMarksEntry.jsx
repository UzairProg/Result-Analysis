import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sidebar, Topbar } from '../../components/Layout';
import {
  getProfessorSubjectsApi,
  getUsersApi,
  getClassResultsApi,
  bulkUpsertResultsApi,
} from '../../api/api';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  Upload,
  Download,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet,
  Save,
  ArrowLeft,
} from 'lucide-react';

export default function ExternalMarksEntry() {
  const location = useLocation();
  const navigate = useNavigate();
  const defaultSubjectId = location.state?.subjectId || '';

  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState(defaultSubjectId);
  const [selectedSubject, setSelectedSubject] = useState(null);

  const [studentsData, setStudentsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [showImportModal, setShowImportModal] = useState(false);
  const [csvRawRows, setCsvRawRows] = useState([]);
  const [csvColumns, setCsvColumns] = useState([]);
  const [mappedPrnCol, setMappedPrnCol] = useState('');
  const [mappedMarksCol, setMappedMarksCol] = useState('');

  const inputRefs = useRef({});

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await getProfessorSubjectsApi();
        const subs = res.data.subjects || [];
        setSubjects(subs);
        if (subs.length > 0 && !selectedSubjectId) {
          setSelectedSubjectId(subs[0]._id);
        }
      } catch (err) {
        console.error('Failed to fetch subjects:', err);
      }
    };
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (!selectedSubjectId || subjects.length === 0) return;

    const sub = subjects.find((s) => s._id === selectedSubjectId);
    setSelectedSubject(sub || null);
    loadClassData(selectedSubjectId, sub?.semester);
  }, [selectedSubjectId, subjects]);

  const loadClassData = async (subjectId, semester) => {
    setLoading(true);
    try {
      const usersRes = await getUsersApi({ role: 'Student', currentSemester: semester || 5 });
      const students = usersRes.data.users || [];

      const resultsRes = await getClassResultsApi(subjectId);
      const existingResults = resultsRes.data.results || [];

      const merged = students.map((st) => {
        const res = existingResults.find((r) => String(r.studentId?._id) === String(st._id));

        const internalTotal = res ? res.internalTotal ?? 0 : 0;
        const endSem = res?.endSem ?? null;
        const endSemRaw = res?.endSemRaw ?? endSem;

        return {
          studentId: st._id,
          name: st.name,
          prn: st.identifier || '—',
          email: st.email,
          ca1: res?.ca1 ?? null,
          mse: res?.mse ?? null,
          ca2: res?.ca2 ?? null,
          internalTotal,
          endSemRaw,
          endSem,
        };
      });

      setStudentsData(merged);
      setIsDirty(false);
    } catch (err) {
      console.error('Error loading external marks:', err);
    } finally {
      setLoading(false);
    }
  };

  const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

  const calculateGrade = (total, endSem) => {
    if (endSem === null || endSem === undefined) return { grade: 'P', status: 'In-Progress' };
    if (endSem < 20 || total < 40) return { grade: 'F', status: 'Failed' };
    if (total >= 90) return { grade: 'O', status: 'Passed' };
    if (total >= 80) return { grade: 'A+', status: 'Passed' };
    if (total >= 70) return { grade: 'A', status: 'Passed' };
    if (total >= 60) return { grade: 'B+', status: 'Passed' };
    if (total >= 50) return { grade: 'B', status: 'Passed' };
    if (total >= 45) return { grade: 'C', status: 'Passed' };
    if (total >= 40) return { grade: 'D', status: 'Passed' };
    return { grade: 'F', status: 'Failed' };
  };

  const handleEndSemChange = (studentId, rawValue) => {
    setStudentsData((prev) =>
      prev.map((row) => {
        if (row.studentId !== studentId) return row;

        if (rawValue === '' || rawValue === null || rawValue === undefined) {
          return {
            ...row,
            endSemRaw: null,
            endSem: null,
          };
        }

        const numVal = Math.min(Math.max(0, parseFloat(rawValue)), 60);
        return {
          ...row,
          endSemRaw: numVal,
          endSem: numVal,
        };
      })
    );
    setIsDirty(true);
  };

  const handleSaveMarks = async () => {
    if (!selectedSubjectId || studentsData.length === 0) return;
    setSaving(true);
    setSaveSuccess(false);

    try {
      const payload = {
        subjectId: selectedSubjectId,
        academicYear: '2025-26',
        assessmentType: 'endSem',
        endSemMax: 60,
        results: studentsData.map((s) => ({
          studentId: s.studentId,
          prn: s.prn,
          endSemRaw: s.endSemRaw,
        })),
      };

      await bulkUpsertResultsApi(payload);
      setIsDirty(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to save external marks:', err);
      alert('Error saving marks: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleExportExcel = () => {
    if (studentsData.length === 0) return;

    const exportRows = studentsData.map((s) => {
      const internal = s.internalTotal || 0;
      const endSem = s.endSem;
      const total = endSem !== null ? round2(internal + endSem) : internal;
      const { grade, status } = calculateGrade(total, endSem);

      return {
        PRN: s.prn,
        Name: s.name,
        'Internal Total (/40)': internal,
        'End-Sem Score (/60)': endSem !== null ? endSem : '—',
        'Total Marks (/100)': endSem !== null ? total : '—',
        Grade: grade,
        Status: status,
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'EndSem');
    XLSX.writeFile(wb, `${selectedSubject?.subjectCode || 'Class'}_EndSem.xlsx`);
  };

  const handleDownloadTemplate = () => {
    if (studentsData.length === 0) return;
    const templateRows = studentsData.map((s) => ({
      PRN: s.prn,
      Name: s.name,
      'EndSem_Score_Max_60': '',
    }));

    const ws = XLSX.utils.json_to_sheet(templateRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, `${selectedSubject?.subjectCode || 'Subject'}_EndSem_Template.xlsx`);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          const cols = Object.keys(results.data[0]);
          setCsvColumns(cols);
          setCsvRawRows(results.data);

          const guessedPrn = cols.find((c) => c.toLowerCase().includes('prn') || c.toLowerCase().includes('id')) || cols[0];
          const guessedMarks = cols.find((c) => c.toLowerCase().includes('end') || c.toLowerCase().includes('score') || c.toLowerCase().includes('60')) || cols[1] || cols[0];

          setMappedPrnCol(guessedPrn);
          setMappedMarksCol(guessedMarks);
          setShowImportModal(true);
        }
      },
      error: (err) => alert('CSV Parse Error: ' + err.message),
    });
    e.target.value = '';
  };

  const applyImportedMarks = () => {
    if (!mappedPrnCol || !mappedMarksCol) return;

    let matched = 0;
    const updated = studentsData.map((row) => {
      const foundCsvRow = csvRawRows.find((cr) => {
        const csvPrn = String(cr[mappedPrnCol] || '').trim().toLowerCase();
        return csvPrn === String(row.prn).trim().toLowerCase();
      });

      if (foundCsvRow && foundCsvRow[mappedMarksCol] !== undefined && foundCsvRow[mappedMarksCol] !== '') {
        matched++;
        const rawNum = parseFloat(String(foundCsvRow[mappedMarksCol]).replace(/[^0-9.]/g, ''));
        if (!isNaN(rawNum)) {
          const clamped = Math.min(Math.max(0, rawNum), 60);
          return {
            ...row,
            endSemRaw: clamped,
            endSem: clamped,
          };
        }
      }
      return row;
    });

    setStudentsData(updated);
    setIsDirty(true);
    setShowImportModal(false);
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextRef = inputRefs.current[`endSem-${index + 1}`];
      if (nextRef) nextRef.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevRef = inputRefs.current[`endSem-${index - 1}`];
      if (prevRef) prevRef.focus();
    }
  };

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return studentsData;
    const q = searchQuery.toLowerCase();
    return studentsData.filter(
      (s) => s.name.toLowerCase().includes(q) || s.prn.toLowerCase().includes(q)
    );
  }, [studentsData, searchQuery]);

  const stats = useMemo(() => {
    const entered = studentsData.filter((s) => s.endSem !== null && s.endSem !== undefined);
    const endSemScores = entered.map((s) => s.endSem);

    let passCount = 0;
    let failCount = 0;

    entered.forEach((s) => {
      const total = (s.internalTotal || 0) + s.endSem;
      if (s.endSem >= 20 && total >= 40) passCount++;
      else failCount++;
    });

    const avg = endSemScores.length > 0 ? (endSemScores.reduce((a, b) => a + b, 0) / endSemScores.length).toFixed(1) : 0;
    const highest = endSemScores.length > 0 ? Math.max(...endSemScores) : 0;
    const lowest = endSemScores.length > 0 ? Math.min(...endSemScores) : 0;

    return {
      enteredCount: entered.length,
      passCount,
      failCount,
      avg,
      highest,
      lowest,
    };
  }, [studentsData]);

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <Topbar
          title="External Assessment"
          subtitle="End-Semester Examination marks entry and grade finalization"
        />

        <main className="page-content">
          {/* Top Actions Row */}
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
              <h2 className="page-title">End-Semester Marks (60M)</h2>
              <p className="page-subtitle">
                Enter theory/practical exam marks. Passing requirement: End-Sem &ge; 20/60 and Aggregate &ge; 40/100.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                className="btn btn-secondary"
                onClick={() => navigate('/professor/internals', { state: { subjectId: selectedSubjectId } })}
              >
                <ArrowLeft size={14} /> Internal Marks
              </button>

              <button
                className="btn btn-primary"
                onClick={handleSaveMarks}
                disabled={saving || !isDirty}
                style={{ minWidth: 120 }}
              >
                {saving ? (
                  <>
                    <div className="spinner spinner-white" /> Saving...
                  </>
                ) : saveSuccess ? (
                  <>
                    <CheckCircle size={14} /> Saved
                  </>
                ) : (
                  <>
                    <Save size={14} /> Save Changes
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Subject Selector Bar */}
          <div
            className="card"
            style={{
              padding: '14px 18px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 260 }}>
              <div style={{ flex: 1, maxWidth: 360 }}>
                <label className="form-label">Subject</label>
                <select
                  className="form-select"
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                >
                  {subjects.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.subjectName} ({s.subjectCode}) · Sem {s.semester}
                    </option>
                  ))}
                </select>
              </div>

              {selectedSubject && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingTop: 18 }}>
                  <span className="badge badge-neutral">Credits: {selectedSubject.credits}</span>
                  <span className="badge badge-neutral">Enrolled: {studentsData.length}</span>
                </div>
              )}
            </div>

            {isDirty && (
              <div
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--status-warning-text)',
                  background: 'var(--status-warning-bg)',
                  border: '1px solid var(--status-warning-border)',
                  padding: '4px 10px',
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontWeight: 500,
                }}
              >
                <AlertTriangle size={14} /> Unsaved changes
              </div>
            )}
          </div>

          {/* STATS OVERVIEW */}
          <div className="grid grid-cols-4" style={{ gap: 12, marginBottom: 16 }}>
            <div className="stat-card">
              <span className="stat-label">Evaluated</span>
              <div className="stat-value">
                {stats.enteredCount}{' '}
                <span style={{ fontSize: '0.8125rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                  / {studentsData.length}
                </span>
              </div>
            </div>

            <div className="stat-card">
              <span className="stat-label">Avg End-Sem Score</span>
              <div className="stat-value">
                {stats.avg}{' '}
                <span style={{ fontSize: '0.8125rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                  / 60
                </span>
              </div>
            </div>

            <div className="stat-card">
              <span className="stat-label">Passing Status</span>
              <div className="stat-value" style={{ fontSize: '1.25rem' }}>
                <span style={{ color: 'var(--status-success-text)' }}>{stats.passCount} Pass</span> ·{' '}
                <span style={{ color: 'var(--status-danger-text)' }}>{stats.failCount} Fail</span>
              </div>
            </div>

            <div className="stat-card">
              <span className="stat-label">Range</span>
              <div className="stat-value" style={{ fontSize: '1.125rem' }}>
                High: {stats.highest} · Low: {stats.lowest}
              </div>
            </div>
          </div>

          {/* TABLE CONTROLS */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 10,
              marginBottom: 12,
            }}
          >
            <div style={{ flex: 1, maxWidth: 280 }}>
              <input
                type="text"
                placeholder="Search PRN or name..."
                className="form-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ padding: '6px 10px', fontSize: '0.8125rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className="btn btn-secondary btn-sm" onClick={handleDownloadTemplate}>
                <FileSpreadsheet size={14} /> Template
              </button>

              <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
                <Upload size={14} /> Import
                <input
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
              </label>

              <button className="btn btn-secondary btn-sm" onClick={handleExportExcel}>
                <Download size={14} /> Export
              </button>
            </div>
          </div>

          {/* DATA TABLE */}
          {loading ? (
            <div className="loading-overlay">
              <div className="spinner spinner-dark" />
              <span>Loading roster...</span>
            </div>
          ) : studentsData.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <p style={{ margin: 0, fontWeight: 600 }}>No students enrolled in this semester.</p>
              </div>
            </div>
          ) : (
            <div className="table-wrapper" style={{ maxHeight: '62vh', overflowY: 'auto' }}>
              <table>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr>
                    <th style={{ width: 45, textAlign: 'center' }}>#</th>
                    <th style={{ width: 130 }}>PRN</th>
                    <th>Student Name</th>
                    <th style={{ width: 120, textAlign: 'center' }}>Internals /40</th>
                    <th style={{ width: 140, textAlign: 'center' }}>Min to Pass</th>
                    <th style={{ width: 160, textAlign: 'center' }}>End-Sem /60</th>
                    <th style={{ width: 120, textAlign: 'center' }}>Total /100</th>
                    <th style={{ width: 90, textAlign: 'center' }}>Grade</th>
                    <th style={{ width: 120, textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredStudents.map((student, idx) => {
                    const internal = student.internalTotal || 0;
                    const endSem = student.endSem;
                    const isEntered = endSem !== null && endSem !== undefined;
                    const total = isEntered ? round2(internal + endSem) : internal;
                    const { grade, status } = calculateGrade(total, endSem);
                    const minNeeded = Math.max(20, round2(40 - internal));
                    const isFailing = isEntered && status === 'Failed';

                    return (
                      <tr
                        key={student.studentId}
                        style={{
                          background: isFailing ? 'var(--status-danger-bg)' : 'transparent',
                        }}
                      >
                        <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                          {idx + 1}
                        </td>
                        <td style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{student.prn}</td>
                        <td style={{ fontWeight: 500 }}>{student.name}</td>

                        <td style={{ textAlign: 'center', fontWeight: 600 }}>
                          {internal}
                        </td>

                        <td style={{ textAlign: 'center', fontSize: '0.8125rem', color: minNeeded > 20 ? 'var(--status-warning-text)' : 'var(--text-muted)' }}>
                          &ge; {minNeeded}/60
                        </td>

                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <input
                              ref={(el) => (inputRefs.current[`endSem-${idx}`] = el)}
                              type="number"
                              step="0.5"
                              min="0"
                              max="60"
                              placeholder="—"
                              value={student.endSemRaw === null || student.endSemRaw === undefined ? '' : student.endSemRaw}
                              onChange={(e) => handleEndSemChange(student.studentId, e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, idx)}
                              style={{
                                width: 65,
                                padding: '5px 8px',
                                textAlign: 'center',
                                borderRadius: 4,
                                border:
                                  student.endSemRaw > 60 || (isEntered && student.endSemRaw < 20)
                                    ? '1px solid var(--status-danger-text)'
                                    : '1px solid #cbd5e1',
                                background:
                                  student.endSemRaw > 60 || (isEntered && student.endSemRaw < 20)
                                    ? 'var(--status-danger-bg)'
                                    : '#ffffff',
                                fontWeight: 600,
                                fontSize: '0.875rem',
                                outline: 'none',
                              }}
                            />
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ 60</span>
                          </div>
                        </td>

                        <td style={{ textAlign: 'center', fontWeight: 700 }}>
                          {isEntered ? total : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>

                        <td style={{ textAlign: 'center', fontWeight: 700 }}>
                          {isEntered ? grade : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>

                        <td style={{ textAlign: 'center' }}>
                          {!isEntered ? (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pending</span>
                          ) : status === 'Passed' ? (
                            <span className="badge badge-success">Passed</span>
                          ) : (
                            <span className="badge badge-danger">Failed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* CSV MAPPING MODAL */}
          {showImportModal && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100,
              }}
            >
              <div className="card" style={{ width: 400, background: '#ffffff' }}>
                <h3 style={{ margin: '0 0 10px', fontSize: '1rem', fontWeight: 700 }}>
                  Map CSV Columns (End-Sem)
                </h3>
                <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: 16 }}>
                  Select the columns corresponding to student PRN and End-Sem marks.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label className="form-label">PRN Column</label>
                    <select
                      className="form-select"
                      value={mappedPrnCol}
                      onChange={(e) => setMappedPrnCol(e.target.value)}
                    >
                      <option value="">Select column...</option>
                      {csvColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label">End-Sem Marks Column (/60)</label>
                    <select
                      className="form-select"
                      value={mappedMarksCol}
                      onChange={(e) => setMappedMarksCol(e.target.value)}
                    >
                      <option value="">Select column...</option>
                      {csvColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowImportModal(false)}>
                    Cancel
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={applyImportedMarks}>
                    Import
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

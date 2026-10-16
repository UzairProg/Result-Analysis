import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sidebar, Topbar } from '../../components/Layout';
import {
  getProfessorSubjectsApi,
  getUsersApi,
  getClassResultsApi,
  bulkUpsertResultsApi,
  updateAssessmentConfigApi,
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
  ArrowRight,
} from 'lucide-react';

export default function InternalMarksEntry() {
  const location = useLocation();
  const navigate = useNavigate();
  const defaultSubjectId = location.state?.subjectId || '';

  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState(defaultSubjectId);
  const [selectedSubject, setSelectedSubject] = useState(null);

  // Active section tab: 'ca1' | 'mse' | 'ca2' | 'consolidated'
  const [activeTab, setActiveTab] = useState('ca1');

  // Roster of students with their assessment marks
  const [studentsData, setStudentsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Paper maximum marks settings (teacher flexibility)
  const [paperMaxMarks, setPaperMaxMarks] = useState({
    ca1: 20,
    mse: 20,
    ca2: 20,
  });

  // Excel/CSV import modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvRawRows, setCsvRawRows] = useState([]);
  const [csvColumns, setCsvColumns] = useState([]);
  const [mappedPrnCol, setMappedPrnCol] = useState('');
  const [mappedMarksCol, setMappedMarksCol] = useState('');

  const inputRefs = useRef({});

  // 1. Fetch professor's assigned subjects
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

  // 2. Load selected subject details and student results
  useEffect(() => {
    if (!selectedSubjectId || subjects.length === 0) return;

    const sub = subjects.find((s) => s._id === selectedSubjectId);
    setSelectedSubject(sub || null);

    if (sub?.assessmentConfig) {
      setPaperMaxMarks({
        ca1: sub.assessmentConfig.ca1Max || 20,
        mse: sub.assessmentConfig.mseMax || 20,
        ca2: sub.assessmentConfig.ca2Max || 20,
      });
    }

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

        return {
          studentId: st._id,
          name: st.name,
          prn: st.identifier || '—',
          email: st.email,

          ca1Raw: res?.ca1Raw ?? (res?.ca1 !== null && res?.ca1 !== undefined ? res.ca1 : null),
          ca1Max: res?.ca1Max || 20,
          ca1: res?.ca1 ?? null,

          mseRaw: res?.mseRaw ?? (res?.mse !== null && res?.mse !== undefined ? res.mse : null),
          mseMax: res?.mseMax || 20,
          mse: res?.mse ?? null,

          ca2Raw: res?.ca2Raw ?? (res?.ca2 !== null && res?.ca2 !== undefined ? res.ca2 : null),
          ca2Max: res?.ca2Max || 20,
          ca2: res?.ca2 ?? null,

          endSem: res?.endSem ?? null,
        };
      });

      setStudentsData(merged);
      setIsDirty(false);
    } catch (err) {
      console.error('Error loading class data:', err);
    } finally {
      setLoading(false);
    }
  };

  const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

  const handleMaxMarksChange = async (section, newMax) => {
    const val = Math.max(1, Number(newMax) || 10);
    setPaperMaxMarks((prev) => ({ ...prev, [section]: val }));
    setIsDirty(true);

    if (selectedSubjectId) {
      try {
        await updateAssessmentConfigApi(selectedSubjectId, {
          ca1Max: section === 'ca1' ? val : paperMaxMarks.ca1,
          mseMax: section === 'mse' ? val : paperMaxMarks.mse,
          ca2Max: section === 'ca2' ? val : paperMaxMarks.ca2,
        });
      } catch (e) {
        console.error('Failed to update assessment config:', e);
      }
    }
  };

  const handleMarkChange = (studentId, section, rawValue) => {
    setStudentsData((prev) =>
      prev.map((row) => {
        if (row.studentId !== studentId) return row;

        if (rawValue === '' || rawValue === null || rawValue === undefined) {
          return {
            ...row,
            [`${section}Raw`]: null,
            [section]: null,
          };
        }

        const max = paperMaxMarks[section] || 20;
        const weightageMax = section === 'mse' ? 20 : 10;
        const numVal = Math.min(Math.max(0, parseFloat(rawValue)), max);
        const scaled = round2((numVal / max) * weightageMax);

        return {
          ...row,
          [`${section}Raw`]: numVal,
          [`${section}Max`]: max,
          [section]: scaled,
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
        assessmentType: activeTab === 'consolidated' ? 'internal' : activeTab,
        ca1Max: paperMaxMarks.ca1,
        mseMax: paperMaxMarks.mse,
        ca2Max: paperMaxMarks.ca2,
        results: studentsData.map((s) => ({
          studentId: s.studentId,
          prn: s.prn,
          ca1Raw: s.ca1Raw,
          mseRaw: s.mseRaw,
          ca2Raw: s.ca2Raw,
        })),
      };

      await bulkUpsertResultsApi(payload);
      setIsDirty(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to save internal marks:', err);
      alert('Error saving marks: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleExportExcel = () => {
    if (studentsData.length === 0) return;

    let exportRows = [];
    let fileName = '';

    if (activeTab === 'consolidated') {
      fileName = `${selectedSubject?.subjectCode || 'Class'}_Consolidated_Internals.xlsx`;
      exportRows = studentsData.map((s) => {
        const c1 = s.ca1 ?? 0;
        const m = s.mse ?? 0;
        const c2 = s.ca2 ?? 0;
        const total = round2(c1 + m + c2);
        return {
          PRN: s.prn,
          Name: s.name,
          'CA1 (/10)': s.ca1 ?? '—',
          'MSE (/20)': s.mse ?? '—',
          'CA2 (/10)': s.ca2 ?? '—',
          'Internal Total (/40)': total,
          Status: total >= 20 ? 'Pass' : 'At-Risk',
        };
      });
    } else {
      const sectionName = activeTab.toUpperCase();
      const max = paperMaxMarks[activeTab];
      const weightage = activeTab === 'mse' ? 20 : 10;
      fileName = `${selectedSubject?.subjectCode || 'Class'}_${sectionName}.xlsx`;

      exportRows = studentsData.map((s) => ({
        PRN: s.prn,
        Name: s.name,
        [`Raw Score (out of ${max})`]: s[`${activeTab}Raw`] ?? '—',
        [`Weighted Score (out of ${weightage})`]: s[activeTab] ?? '—',
      }));
    }

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Marks');
    XLSX.writeFile(wb, fileName);
  };

  const handleDownloadTemplate = () => {
    if (studentsData.length === 0) return;
    const max = paperMaxMarks[activeTab] || 20;
    const templateRows = studentsData.map((s) => ({
      PRN: s.prn,
      Name: s.name,
      [`${activeTab.toUpperCase()}_Score_Max_${max}`]: '',
    }));

    const ws = XLSX.utils.json_to_sheet(templateRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, `${selectedSubject?.subjectCode || 'Subject'}_${activeTab.toUpperCase()}_Template.xlsx`);
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
          const guessedMarks = cols.find((c) => c.toLowerCase().includes('score') || c.toLowerCase().includes('mark') || c.toLowerCase().includes(activeTab)) || cols[1] || cols[0];

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
    const max = paperMaxMarks[activeTab] || 20;
    const weightageMax = activeTab === 'mse' ? 20 : 10;

    const updated = studentsData.map((row) => {
      const foundCsvRow = csvRawRows.find((cr) => {
        const csvPrn = String(cr[mappedPrnCol] || '').trim().toLowerCase();
        return csvPrn === String(row.prn).trim().toLowerCase();
      });

      if (foundCsvRow && foundCsvRow[mappedMarksCol] !== undefined && foundCsvRow[mappedMarksCol] !== '') {
        matched++;
        const rawNum = parseFloat(String(foundCsvRow[mappedMarksCol]).replace(/[^0-9.]/g, ''));
        if (!isNaN(rawNum)) {
          const clamped = Math.min(Math.max(0, rawNum), max);
          const scaled = round2((clamped / max) * weightageMax);
          return {
            ...row,
            [`${activeTab}Raw`]: clamped,
            [`${activeTab}Max`]: max,
            [activeTab]: scaled,
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
      const nextRef = inputRefs.current[`${activeTab}-${index + 1}`];
      if (nextRef) nextRef.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevRef = inputRefs.current[`${activeTab}-${index - 1}`];
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

  const sectionStats = useMemo(() => {
    if (studentsData.length === 0) return { entered: 0, avgPaper: 0, avgScaled: 0, highest: 0, lowest: 0 };

    if (activeTab === 'consolidated') {
      const enteredRows = studentsData.filter((s) => s.ca1 !== null || s.mse !== null || s.ca2 !== null);
      const totals = enteredRows.map((s) => (s.ca1 || 0) + (s.mse || 0) + (s.ca2 || 0));
      const avg = totals.length > 0 ? (totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(1) : 0;
      return {
        entered: enteredRows.length,
        avgScaled: avg,
        highest: totals.length > 0 ? Math.max(...totals).toFixed(1) : 0,
        lowest: totals.length > 0 ? Math.min(...totals).toFixed(1) : 0,
      };
    }

    const entered = studentsData.filter((s) => s[`${activeTab}Raw`] !== null && s[`${activeTab}Raw`] !== undefined);
    const paperScores = entered.map((s) => s[`${activeTab}Raw`]);
    const scaledScores = entered.map((s) => s[activeTab]);

    const avgPaper = paperScores.length > 0 ? (paperScores.reduce((a, b) => a + b, 0) / paperScores.length).toFixed(1) : 0;
    const avgScaled = scaledScores.length > 0 ? (scaledScores.reduce((a, b) => a + b, 0) / scaledScores.length).toFixed(1) : 0;
    const highest = paperScores.length > 0 ? Math.max(...paperScores) : 0;
    const lowest = paperScores.length > 0 ? Math.min(...paperScores) : 0;

    return {
      entered: entered.length,
      avgPaper,
      avgScaled,
      highest,
      lowest,
    };
  }, [studentsData, activeTab]);

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <Topbar
          title="Internal Assessment"
          subtitle="Continuous Assessment (CA1, CA2) and Mid-Semester Examination (MSE)"
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
              <h2 className="page-title">Marks Entry & Scaling</h2>
              <p className="page-subtitle">
                Enter raw paper scores. The system automatically converts them to official weightages.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                className="btn btn-secondary"
                onClick={() => navigate('/professor/external', { state: { subjectId: selectedSubjectId } })}
              >
                External Marks <ArrowRight size={14} />
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

          {/* TABS */}
          <div
            style={{
              display: 'flex',
              gap: 4,
              background: '#f1f5f9',
              padding: '4px',
              borderRadius: 6,
              border: '1px solid #e2e8f0',
              marginBottom: 16,
              width: 'fit-content',
            }}
          >
            {[
              { id: 'ca1', label: 'CA1', weight: '10M' },
              { id: 'mse', label: 'MSE', weight: '20M' },
              { id: 'ca2', label: 'CA2', weight: '10M' },
              { id: 'consolidated', label: 'Consolidated', weight: '40M' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '6px 14px',
                    border: 'none',
                    background: isActive ? '#ffffff' : 'transparent',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#0f172a' : '#64748b',
                    borderRadius: 4,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: '0.8125rem',
                    boxShadow: isActive ? '0 1px 2px rgba(0, 0, 0, 0.05)' : 'none',
                  }}
                >
                  <span>{tab.label}</span>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      padding: '1px 5px',
                      borderRadius: 3,
                      background: isActive ? '#f1f5f9' : 'rgba(0,0,0,0.04)',
                      color: isActive ? '#0f172a' : '#94a3b8',
                    }}
                  >
                    {tab.weight}
                  </span>
                </button>
              );
            })}
          </div>

          {/* SECTION CONFIGURATION TOOLBAR (For CA1, MSE, CA2) */}
          {activeTab !== 'consolidated' && (
            <div
              className="card"
              style={{
                marginBottom: 16,
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 14,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a' }}>
                  Paper Maximum:
                </span>
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={paperMaxMarks[activeTab]}
                  onChange={(e) => handleMaxMarksChange(activeTab, e.target.value)}
                  style={{
                    width: 55,
                    padding: '4px 6px',
                    border: '1px solid #cbd5e1',
                    borderRadius: 4,
                    fontWeight: 600,
                    textAlign: 'center',
                    fontSize: '0.875rem',
                  }}
                />
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Marks</span>

                {/* Presets */}
                <div style={{ display: 'flex', gap: 4, marginLeft: 6 }}>
                  {[10, 20, 25, 30, 50].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleMaxMarksChange(activeTab, preset)}
                      style={{
                        fontSize: '0.75rem',
                        padding: '3px 7px',
                        borderRadius: 3,
                        border: paperMaxMarks[activeTab] === preset ? '1px solid #0f172a' : '1px solid #e2e8f0',
                        background: paperMaxMarks[activeTab] === preset ? '#0f172a' : '#ffffff',
                        color: paperMaxMarks[activeTab] === preset ? '#ffffff' : '#475569',
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Formula: (Score ÷ {paperMaxMarks[activeTab]}) × {activeTab === 'mse' ? 20 : 10} = Weighted Mark (/{activeTab === 'mse' ? 20 : 10})
              </div>
            </div>
          )}

          {/* STATS OVERVIEW */}
          <div className="grid grid-cols-4" style={{ gap: 12, marginBottom: 16 }}>
            <div className="stat-card">
              <span className="stat-label">Evaluated</span>
              <div className="stat-value">
                {sectionStats.entered}{' '}
                <span style={{ fontSize: '0.8125rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                  / {studentsData.length}
                </span>
              </div>
            </div>

            {activeTab !== 'consolidated' && (
              <div className="stat-card">
                <span className="stat-label">Avg Raw Score</span>
                <div className="stat-value">
                  {sectionStats.avgPaper}{' '}
                  <span style={{ fontSize: '0.8125rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                    / {paperMaxMarks[activeTab]}
                  </span>
                </div>
              </div>
            )}

            <div className="stat-card">
              <span className="stat-label">
                {activeTab === 'consolidated' ? 'Avg Total' : 'Avg Weighted'}
              </span>
              <div className="stat-value">
                {sectionStats.avgScaled}{' '}
                <span style={{ fontSize: '0.8125rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                  / {activeTab === 'consolidated' ? 40 : activeTab === 'mse' ? 20 : 10}
                </span>
              </div>
            </div>

            <div className="stat-card">
              <span className="stat-label">Range</span>
              <div className="stat-value" style={{ fontSize: '1.125rem' }}>
                High: {sectionStats.highest} · Low: {sectionStats.lowest}
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
              {activeTab !== 'consolidated' && (
                <>
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
                </>
              )}

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
                  {activeTab !== 'consolidated' ? (
                    <tr>
                      <th style={{ width: 45, textAlign: 'center' }}>#</th>
                      <th style={{ width: 130 }}>PRN</th>
                      <th>Student Name</th>
                      <th style={{ width: 170, textAlign: 'center' }}>
                        Paper Score (/{paperMaxMarks[activeTab]})
                      </th>
                      <th style={{ width: 150, textAlign: 'center' }}>
                        Weighted (/{activeTab === 'mse' ? 20 : 10})
                      </th>
                      <th style={{ width: 120, textAlign: 'center' }}>Status</th>
                    </tr>
                  ) : (
                    <tr>
                      <th style={{ width: 45, textAlign: 'center' }}>#</th>
                      <th style={{ width: 130 }}>PRN</th>
                      <th>Student Name</th>
                      <th style={{ width: 100, textAlign: 'center' }}>CA1 /10</th>
                      <th style={{ width: 100, textAlign: 'center' }}>MSE /20</th>
                      <th style={{ width: 100, textAlign: 'center' }}>CA2 /10</th>
                      <th style={{ width: 140, textAlign: 'center' }}>Total /40</th>
                      <th style={{ width: 120, textAlign: 'center' }}>Status</th>
                    </tr>
                  )}
                </thead>

                <tbody>
                  {filteredStudents.map((student, idx) => {
                    if (activeTab !== 'consolidated') {
                      const raw = student[`${activeTab}Raw`];
                      const scaled = student[activeTab];
                      const max = paperMaxMarks[activeTab];
                      const isEntered = raw !== null && raw !== undefined;

                      return (
                        <tr key={student.studentId}>
                          <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            {idx + 1}
                          </td>
                          <td style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{student.prn}</td>
                          <td style={{ fontWeight: 500 }}>{student.name}</td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              <input
                                ref={(el) => (inputRefs.current[`${activeTab}-${idx}`] = el)}
                                type="number"
                                step="0.5"
                                min="0"
                                max={max}
                                placeholder="—"
                                value={raw === null || raw === undefined ? '' : raw}
                                onChange={(e) => handleMarkChange(student.studentId, activeTab, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, idx)}
                                style={{
                                  width: 65,
                                  padding: '5px 8px',
                                  textAlign: 'center',
                                  borderRadius: 4,
                                  border: raw > max ? '1px solid var(--status-danger-text)' : '1px solid #cbd5e1',
                                  background: raw > max ? 'var(--status-danger-bg)' : '#ffffff',
                                  fontWeight: 600,
                                  fontSize: '0.875rem',
                                  outline: 'none',
                                }}
                              />
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ {max}</span>
                            </div>
                          </td>

                          <td style={{ textAlign: 'center', fontWeight: 600 }}>
                            {isEntered ? scaled : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                          </td>

                          <td style={{ textAlign: 'center' }}>
                            {isEntered ? (
                              scaled >= (activeTab === 'mse' ? 14 : 7) ? (
                                <span className="badge badge-success">Good</span>
                              ) : scaled >= (activeTab === 'mse' ? 10 : 5) ? (
                                <span className="badge badge-neutral">Average</span>
                              ) : (
                                <span className="badge badge-warning">Low</span>
                              )
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pending</span>
                            )}
                          </td>
                        </tr>
                      );
                    } else {
                      const c1 = student.ca1 ?? 0;
                      const m = student.mse ?? 0;
                      const c2 = student.ca2 ?? 0;
                      const hasAny = student.ca1 !== null || student.mse !== null || student.ca2 !== null;
                      const internalTotal = round2(c1 + m + c2);
                      const isAtRisk = hasAny && internalTotal < 20;

                      return (
                        <tr
                          key={student.studentId}
                          style={{
                            background: isAtRisk ? 'var(--status-danger-bg)' : 'transparent',
                          }}
                        >
                          <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            {idx + 1}
                          </td>
                          <td style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{student.prn}</td>
                          <td style={{ fontWeight: 500 }}>{student.name}</td>
                          <td style={{ textAlign: 'center' }}>{student.ca1 ?? '—'}</td>
                          <td style={{ textAlign: 'center' }}>{student.mse ?? '—'}</td>
                          <td style={{ textAlign: 'center' }}>{student.ca2 ?? '—'}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>
                            {hasAny ? internalTotal : '—'}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {!hasAny ? (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No marks</span>
                            ) : isAtRisk ? (
                              <span className="badge badge-danger">At-Risk (&lt;20)</span>
                            ) : internalTotal >= 32 ? (
                              <span className="badge badge-success">Good</span>
                            ) : (
                              <span className="badge badge-neutral">Average</span>
                            )}
                          </td>
                        </tr>
                      );
                    }
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
                  Map CSV Columns ({activeTab.toUpperCase()})
                </h3>
                <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: 16 }}>
                  Select the columns corresponding to student PRN and marks.
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
                    <label className="form-label">Score Column</label>
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

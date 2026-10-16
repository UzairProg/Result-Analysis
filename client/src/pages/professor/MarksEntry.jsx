import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar, Topbar } from '../../components/Layout';
import { getProfessorSubjectsApi, getUsersApi, getClassResultsApi, bulkUpsertResultsApi } from '../../api/api';
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { ClipboardList, Upload, AlertTriangle, CheckCircle, Download } from 'lucide-react';

const CSV_FIELD_LABELS = {
  prn: 'PRN',
  studentName: 'Name of the Student',
  ca1: 'CA1 (10)',
  mse: 'MSE (20)',
  ca2: 'CA2 (10)',
  endSem: 'End-Sem (60)',
};

const CSV_FIELD_ORDER = ['prn', 'studentName', 'ca1', 'mse', 'ca2', 'endSem'];
const MARK_LIMITS = { ca1: 10, mse: 20, ca2: 10, endSem: 60 };

const normalizeCsvHeader = (header) => String(header ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

const mapCsvHeader = (header) => {
  const normalized = normalizeCsvHeader(header);
  if (normalized === 'prn') return 'prn';
  if (normalized === 'name of the student') return 'studentName';
  if (normalized === 'ca1 (10)' || normalized === 'ca1') return 'ca1';
  if (normalized === 'mse (20)' || normalized === 'mse') return 'mse';
  if (normalized === 'ca2 (10)' || normalized === 'ca2') return 'ca2';
  if (normalized === 'end-sem (60)' || normalized === 'end-sem') return 'endSem';
  return null;
};

const normalizeTextValue = (value) => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text === '' ? null : text;
};

const normalizeMarkValue = (value, max) => {
  const text = normalizeTextValue(value);
  if (text === null) return null;
  const cleaned = text.replace(/,/g, '').replace(/[^\d.-]/g, '');
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > max) return null;
  return parsed;
};

// Custom editable cell component
const EditableCell = ({ getValue, row, column, table }) => {
  const value = getValue();

  const onChange = (e) => {
    const nextValue = e.target.value === '' ? null : e.target.value;
    table.options.meta?.updateData(row.index, column.id, nextValue);
  };

  const maxVals = { ca1: 10, mse: 20, ca2: 10, endSem: 60 };
  const max = maxVals[column.id];
  const normalizedValue = value === null || value === undefined ? '' : value;
  const isValid = normalizedValue === '' || (Number(normalizedValue) >= 0 && Number(normalizedValue) <= max);

  return (
    <input
      type="number"
      value={normalizedValue}
      placeholder="TBD"
      onChange={onChange}
      style={{
        width: '60px', padding: '6px', border: isValid ? '1px solid var(--border)' : '2px solid var(--danger)',
        borderRadius: '6px', textAlign: 'center', background: isValid ? 'white' : 'var(--danger-light)',
        outline: 'none',
        fontSize: '0.875rem'
      }}
      min="0" max={max}
    />
  );
};

export default function MarksEntry() {
  const location = useLocation();
  const defaultSubjectId = location.state?.subjectId || '';

  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(defaultSubjectId);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // CSV State
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvData, setCsvData] = useState([]);
  const [showMapping, setShowMapping] = useState(false);
  const [mapping, setMapping] = useState({ prn: '', studentName: '', ca1: '', mse: '', ca2: '', endSem: '' });

  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const res = await getProfessorSubjectsApi();
        setSubjects(res.data.subjects || []);
      } catch (err) { console.error(err); }
    };
    loadSubjects();
  }, []);

  const loadStudents = async () => {
    if (!selectedSubject) return;
    setLoading(true);
    try {
      const subject = subjects.find(s => s._id === selectedSubject);

      // 1. Get all students for this semester
      const usersRes = await getUsersApi({ role: 'Student', currentSemester: subject.semester });
      const classStudents = usersRes.data.users || [];

      // 2. Get existing results
      const resultsRes = await getClassResultsApi(selectedSubject);
      const existingResults = resultsRes.data.results || [];

      // 3. Merge
      const tableData = classStudents.map(student => {
        const result = existingResults.find(r => r.studentId?._id === student._id);
        return {
          _id: student._id,
          name: student.name,
          prn: student.identifier,
          studentName: student.name,
          ca1: result?.ca1 ?? null,
          mse: result?.mse ?? null,
          ca2: result?.ca2 ?? null,
          endSem: result?.endSem ?? null,
          // computed in render
        };
      });

      setData(tableData);
      setIsDirty(false);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (selectedSubject && subjects.length > 0) loadStudents();
  }, [selectedSubject, subjects]);

  // Handle CSV Upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length > 0) {
          const normalizedRows = results.data
            .map((row) => {
              const cleanedRow = {};

              Object.entries(row).forEach(([rawHeader, rawValue]) => {
                const canonicalField = mapCsvHeader(rawHeader);
                if (!canonicalField) return;

                if (canonicalField === 'prn' || canonicalField === 'studentName') {
                  cleanedRow[canonicalField] = normalizeTextValue(rawValue);
                  return;
                }

              });

              return cleanedRow;
            })
            .filter((row) => Object.keys(row).length > 0);

          const availableHeaders = CSV_FIELD_ORDER.filter((field) => normalizedRows.some((row) => row[field] !== undefined));

          setCsvHeaders(availableHeaders);
          setCsvData(normalizedRows);
          setMapping({ prn: 'prn', studentName: 'studentName', ca1: 'ca1', mse: 'mse', ca2: 'ca2', endSem: 'endSem' });
          setShowMapping(true);
        }
      }
    });
  };

  const applyCsvMapping = () => {
    const newData = [...data];
    let errors = 0;

    csvData.forEach(row => {
      const prn = normalizeTextValue(row[mapping.prn]);
      const studentName = normalizeTextValue(row[mapping.studentName]);
      const studentIdx = newData.findIndex(d => d.prn === prn);
      if (studentIdx !== -1) {
        newData[studentIdx] = {
          ...newData[studentIdx],
          name: studentName || newData[studentIdx].name,
          studentName: studentName || newData[studentIdx].studentName,
          ca1: normalizeMarkValue(row[mapping.ca1], MARK_LIMITS.ca1),
          mse: normalizeMarkValue(row[mapping.mse], MARK_LIMITS.mse),
          ca2: normalizeMarkValue(row[mapping.ca2], MARK_LIMITS.ca2),
          endSem: normalizeMarkValue(row[mapping.endSem], MARK_LIMITS.endSem),
        };
      } else {
        errors++;
      }
    });

    setData(newData);
    setShowMapping(false);
    setIsDirty(true);
    if (errors > 0) alert(`Imported with ${errors} unrecognized PRNs.`);
  };

  const updateData = (rowIndex, columnId, value) => {
    setData(old =>
      old.map((row, index) => {
        if (index === rowIndex) return { ...row, [columnId]: value };
        return row;
      })
    );
    setIsDirty(true);
  };

  const saveResults = async () => {
    if (!selectedSubject) return;
    setSaving(true);
    try {
      const payload = {
        subjectId: selectedSubject,
        academicYear: '2025-26', // hardcoded for demo
        results: data.map(d => ({
          prn: normalizeTextValue(d.prn),
          studentId: d._id,
          studentName: normalizeTextValue(d.name),
          ca1: normalizeMarkValue(d.ca1, MARK_LIMITS.ca1),
          mse: normalizeMarkValue(d.mse, MARK_LIMITS.mse),
          ca2: normalizeMarkValue(d.ca2, MARK_LIMITS.ca2),
          endSem: normalizeMarkValue(d.endSem, MARK_LIMITS.endSem),
        }))
      };
      await bulkUpsertResultsApi(payload);
      setIsDirty(false);
      // alert('Marks saved successfully!'); // Removed alert for auto-save silently
      // loadStudents(); // Removed reload to avoid interrupting typing
    } catch (err) {
      console.error('Error saving marks: ', err);
    } finally {
      setSaving(false);
    }
  };

  // Debounced auto-save
  useEffect(() => {
    if (!isDirty || data.length === 0) return;
    const timeoutId = setTimeout(() => {
      saveResults();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [data, isDirty]);

  const exportToExcel = () => {
    const exportData = data.map(d => {
      const e = normalizeMarkValue(d.endSem, MARK_LIMITS.endSem) || 0;
      const internal = (normalizeMarkValue(d.ca1, MARK_LIMITS.ca1) || 0) + (normalizeMarkValue(d.mse, MARK_LIMITS.mse) || 0) + (normalizeMarkValue(d.ca2, MARK_LIMITS.ca2) || 0);
      const total = internal + e;

      let status = 'In-Progress';
      let grade = 'P';

      if (d.endSem != null) {
        if (e >= 20 && total >= 40) {
          status = 'Passed';
          if (total >= 90) grade = 'O';
          else if (total >= 80) grade = 'A+';
          else if (total >= 70) grade = 'A';
          else if (total >= 60) grade = 'B+';
          else if (total >= 50) grade = 'B';
          else if (total >= 45) grade = 'C';
          else if (total >= 40) grade = 'D';
        } else {
          status = 'Failed';
          grade = 'F';
        }
      }

      return {
        PRN: d.prn || '—',
        Name: d.name,
        CA1: d.ca1 == null ? '—' : d.ca1,
        MSE: d.mse == null ? '—' : d.mse,
        CA2: d.ca2 == null ? '—' : d.ca2,
        EndSem: d.endSem == null ? '—' : d.endSem,
        Total: total,
        Grade: grade,
        Status: status
      };
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Marks");
    XLSX.writeFile(wb, "Class_Marksheet.xlsx");
  };

  const columns = useMemo(() => [
    { header: 'PRN', accessorKey: 'prn', cell: info => <span style={{ fontWeight: 600 }}>{info.getValue() || '—'}</span> },
    { header: 'Student Name', accessorKey: 'name' },
    { header: 'CA1 (10)', accessorKey: 'ca1', cell: EditableCell },
    { header: 'MSE (20)', accessorKey: 'mse', cell: EditableCell },
    { header: 'CA2 (10)', accessorKey: 'ca2', cell: EditableCell },
    { header: 'End-Sem (60)', accessorKey: 'endSem', cell: EditableCell },
    {
      id: 'total',
      header: 'Total',
      cell: ({ row }) => {
        const { ca1, mse, ca2, endSem } = row.original;
        const total = (normalizeMarkValue(ca1, MARK_LIMITS.ca1) || 0) + (normalizeMarkValue(mse, MARK_LIMITS.mse) || 0) + (normalizeMarkValue(ca2, MARK_LIMITS.ca2) || 0) + (normalizeMarkValue(endSem, MARK_LIMITS.endSem) || 0);
        return <span style={{ fontWeight: 700 }}>{total}</span>;
      }
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const { ca1, mse, ca2, endSem } = row.original;
        const internal = (normalizeMarkValue(ca1, MARK_LIMITS.ca1) || 0) + (normalizeMarkValue(mse, MARK_LIMITS.mse) || 0) + (normalizeMarkValue(ca2, MARK_LIMITS.ca2) || 0);
        const e = normalizeMarkValue(endSem, MARK_LIMITS.endSem) || 0;
        const total = internal + e;

        if (endSem != null) {
          if (e >= 20 && total >= 40) return <span className="badge badge-success">Passed</span>;
          else return <span className="badge badge-danger">Failed</span>;
        } else {
          return <span className="badge badge-neutral" style={{ background: '#e8f0fe', color: '#1a73e8', fontWeight: 600 }}>In-Progress</span>;
        }
      }
    }
  ], []);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    meta: { updateData }
  });

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="Marks Entry" subtitle="Enter student marks for your assigned subjects" />
        <main className="page-content">
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 className="page-title">Marks Management</h2>
              <p className="page-subtitle">Select a subject and enter marks in the spreadsheet view.</p>
            </div>
            {data.length > 0 && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: '0.875rem', color: saving ? 'var(--text-secondary)' : 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {saving ? <><div className="spinner spinner-dark" style={{ width: 14, height: 14 }} /> Saving...</> : <><CheckCircle size={14} /> Saved</>}
                </span>
                <button className="btn btn-secondary" onClick={exportToExcel}>
                  <Download size={16} /> Export to Excel
                </button>
              </div>
            )}
          </div>

          {/* Controls Row */}
          <div className="card" style={{ marginBottom: 20, display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label className="form-label">Subject</label>
              <select className="form-select" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
                <option value="">Select a subject...</option>
                {subjects.map(s => <option key={s._id} value={s._id}>{s.subjectName} ({s.subjectCode}) - Sem {s.semester}</option>)}
              </select>
            </div>

            {data.length > 0 && (
              <div style={{ position: 'relative' }}>
                <input type="file" accept=".csv" id="csvUpload" style={{ display: 'none' }} onChange={handleFileUpload} />
                <label htmlFor="csvUpload" className="btn btn-secondary" style={{ cursor: 'pointer', height: 42 }}>
                  <Upload size={16} /> Import via CSV
                </label>
              </div>
            )}
          </div>

          {/* Mapping Modal */}
          {showMapping && (
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
            }}>
              <div className="card animate-fade-in" style={{ width: 400, background: 'white' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '1.125rem', fontWeight: 600 }}>Map CSV Columns</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
                  Match your CSV headers to the required fields.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {CSV_FIELD_ORDER.map(field => (
                    <div key={field} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 500, fontSize: '0.875rem', width: 120 }}>{CSV_FIELD_LABELS[field]}</span>
                      <select
                        className="form-select" style={{ flex: 1 }}
                        value={mapping[field]} onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}
                      >
                        <option value="">-- Ignore --</option>
                        {csvHeaders.map(h => <option key={h} value={h}>{CSV_FIELD_LABELS[h] || h}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary" onClick={() => setShowMapping(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={applyCsvMapping}>Apply to Table</button>
                </div>
              </div>
            </div>
          )}

          {/* Table Area */}
          {loading ? (
            <div className="loading-overlay">
              <div className="spinner spinner-dark" />
              <span>Loading students...</span>
            </div>
          ) : !selectedSubject ? (
            <div className="card animate-fade-in">
              <div className="empty-state">
                <ClipboardList size={40} color="var(--text-tertiary)" />
                <p style={{ margin: 0, fontWeight: 500 }}>No subject selected</p>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>Select a subject above to load the student list and enter marks.</p>
              </div>
            </div>
          ) : data.length === 0 ? (
            <div className="card animate-fade-in">
              <div className="empty-state">
                <AlertTriangle size={40} color="var(--warning)" />
                <p style={{ margin: 0, fontWeight: 500 }}>No Students Found</p>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>There are no students enrolled in this semester.</p>
              </div>
            </div>
          ) : (
            <>
              <div style={{ padding: '12px 16px', background: '#e8f0fe', borderRadius: 10, border: '1px solid #c5d8fb', marginBottom: 16 }}>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: '#1a73e8', fontWeight: 500 }}>
                  Editing {data.length} students. Invalid values are highlighted in red.
                </p>
                <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                  <span style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)' }} /> FAIL: endSem entered and &lt; 20 or total &lt; 40
                  </span>
                  <span style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--at-risk)' }} /> AT-RISK: Internals &lt; 20 (still passable if endSem high)
                  </span>
                </div>
              </div>

              <div className="table-wrapper animate-fade-in" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                <table style={{ minWidth: 800 }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--surface)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    {table.getHeaderGroups().map(headerGroup => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map(header => (
                          <th key={header.id} style={{ padding: '12px 16px', textAlign: header.id.match(/ca1|mse|ca2|endSem|total|status/) ? 'center' : 'left' }}>
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.map(row => {
                      const st = row.original;
                      const internal = (normalizeMarkValue(st.ca1, MARK_LIMITS.ca1) || 0) + (normalizeMarkValue(st.mse, MARK_LIMITS.mse) || 0) + (normalizeMarkValue(st.ca2, MARK_LIMITS.ca2) || 0);
                      const e = normalizeMarkValue(st.endSem, MARK_LIMITS.endSem) || 0;
                      const total = internal + e;
                      const isFail = st.endSem != null && (e < 20 || total < 40);

                      let bg = 'white';
                      if (isFail) bg = 'var(--danger-light)';

                      return (
                        <tr key={row.id} style={{ background: bg, borderBottom: '1px solid var(--border)' }}>
                          {row.getVisibleCells().map(cell => (
                            <td key={cell.id} style={{ padding: '8px 16px', textAlign: cell.column.id.match(/ca1|mse|ca2|endSem|total|status/) ? 'center' : 'left' }}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

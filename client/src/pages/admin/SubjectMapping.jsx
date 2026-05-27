import { useState, useEffect } from 'react';
import { Sidebar, Topbar } from '../../components/Layout';
import { getSubjectsApi, updateSubjectApi, getUsersApi, createSubjectApi } from '../../api/api';
import { BookOpen, Plus, Search, Check } from 'lucide-react';

export default function SubjectMapping() {
  const [subjects, setSubjects] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [semesterFilter, setSemesterFilter] = useState('');
  const [search, setSearch] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [newSubject, setNewSubject] = useState({ subjectName: '', subjectCode: '', credits: 3, semester: 1 });

  const loadData = async () => {
    try {
      const [subRes, profRes] = await Promise.all([
        getSubjectsApi(),
        getUsersApi({ role: 'Professor', limit: 1000 })
      ]);
      setSubjects(subRes.data.subjects);
      setProfessors(profRes.data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleAssignProfessor = async (subjectId, professorId) => {
    try {
      await updateSubjectApi(subjectId, { assignedProfessor: professorId || null });
      // Update local state for immediate feedback
      setSubjects(old => old.map(s => {
        if (s._id === subjectId) {
          return { ...s, assignedProfessor: professorId ? professors.find(p => p._id === professorId) : null };
        }
        return s;
      }));
    } catch (err) {
      alert('Failed to assign professor.');
    }
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    try {
      await createSubjectApi(newSubject);
      setShowModal(false);
      setNewSubject({ subjectName: '', subjectCode: '', credits: 3, semester: 1 });
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create subject.');
    }
  };

  const filteredSubjects = subjects.filter(s => {
    const matchSem = semesterFilter ? s.semester.toString() === semesterFilter : true;
    const matchSearch = search ? s.subjectName.toLowerCase().includes(search.toLowerCase()) || s.subjectCode.toLowerCase().includes(search.toLowerCase()) : true;
    return matchSem && matchSearch;
  });

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="Subject Mapping" subtitle="Create and assign subjects to professors" />
        <main className="page-content">
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 className="page-title">Subject Mapping</h2>
              <p className="page-subtitle">Define subjects per semester and assign faculty.</p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={16} /> Add Subject
            </button>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
            {['All', ...Array.from({ length: 8 }, (_, i) => i + 1)].map((t, i) => {
              const val = t === 'All' ? '' : t.toString();
              return (
                <button
                  key={t}
                  onClick={() => setSemesterFilter(val)}
                  className={`btn ${semesterFilter === val ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {t === 'All' ? 'All' : `Sem ${t}`}
                </button>
              );
            })}
          </div>

          <div style={{ position: 'relative', marginBottom: 16 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input
              className="form-input"
              style={{ paddingLeft: 36, maxWidth: 400 }}
              placeholder="Search subjects by name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="table-wrapper animate-fade-in">
            <table>
              <thead>
                <tr>
                  <th>Subject Name</th>
                  <th>Code</th>
                  <th>Sem</th>
                  <th>Credits</th>
                  <th>Assigned Professor</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '40px 0' }}>
                      <div className="spinner spinner-dark" style={{ margin: '0 auto' }} />
                    </td>
                  </tr>
                ) : filteredSubjects.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-tertiary)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                        <BookOpen size={32} color="var(--text-tertiary)" />
                        <span>No subjects found.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredSubjects.map((sub) => (
                    <tr key={sub._id}>
                      <td style={{ fontWeight: 600 }}>{sub.subjectName}</td>
                      <td><span className="badge badge-neutral">{sub.subjectCode}</span></td>
                      <td>{sub.semester}</td>
                      <td>{sub.credits}</td>
                      <td>
                        <select
                          className="form-select"
                          style={{ width: '100%', maxWidth: 250, padding: '6px 12px' }}
                          value={sub.assignedProfessor?._id || ''}
                          onChange={(e) => handleAssignProfessor(sub._id, e.target.value)}
                        >
                          <option value="">-- Unassigned --</option>
                          {professors.map(p => (
                            <option key={p._id} value={p._id}>{p.name} ({p.identifier})</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Add Subject Modal */}
          {showModal && (
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
            }}>
              <form onSubmit={handleCreateSubject} className="card animate-fade-in" style={{ width: 400, background: 'white' }}>
                <h3 style={{ margin: '0 0 20px', fontSize: '1.25rem', fontWeight: 600 }}>Add New Subject</h3>
                <div className="form-group">
                  <label className="form-label">Subject Name</label>
                  <input required className="form-input" value={newSubject.subjectName} onChange={e => setNewSubject({...newSubject, subjectName: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Subject Code</label>
                  <input required className="form-input" value={newSubject.subjectCode} onChange={e => setNewSubject({...newSubject, subjectCode: e.target.value})} />
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Semester</label>
                    <select required className="form-select" value={newSubject.semester} onChange={e => setNewSubject({...newSubject, semester: Number(e.target.value)})}>
                      {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Credits</label>
                    <input required type="number" min="1" max="6" className="form-input" value={newSubject.credits} onChange={e => setNewSubject({...newSubject, credits: Number(e.target.value)})} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 10, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary"><Check size={16}/> Save Subject</button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

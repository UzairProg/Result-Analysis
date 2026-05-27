import { useState, useEffect } from 'react';
import { Sidebar, Topbar } from '../../components/Layout';
import { getUsersApi, updateUserApi, createUserApi, bulkPromoteStudentsApi } from '../../api/api';
import { Users, Plus, Search, GraduationCap, BookOpenCheck, Shield, Key, Check, ArrowUpRight, CheckCircle } from 'lucide-react';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('');
  const [search, setSearch] = useState('');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'Student', identifier: '', department: 'CSE' });

  const [toastMsg, setToastMsg] = useState('');
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [promoteSem, setPromoteSem] = useState(1);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const loadData = async () => {
    try {
      const res = await getUsersApi({ limit: 1000 });
      setUsers(res.data.users);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateUserApi(userId, { role: newRole });
      setUsers(old => old.map(u => u._id === userId ? { ...u, role: newRole } : u));
      showToast('User role updated.');
    } catch (err) { alert('Failed to update role'); }
  };

  const handleSemChange = async (userId, newSem) => {
    try {
      await updateUserApi(userId, { currentSemester: Number(newSem) });
      setUsers(old => old.map(u => u._id === userId ? { ...u, currentSemester: Number(newSem) } : u));
      showToast('Student semester updated.');
    } catch (err) { alert('Failed to update semester'); }
  };

  const handlePromoteBatch = async () => {
    try {
      const res = await bulkPromoteStudentsApi({ fromSemester: promoteSem });
      showToast(res.data.message);
      setShowPromoteModal(false);
      loadData();
    } catch (err) { alert(err.response?.data?.message || 'Failed to promote batch'); }
  };

  const handleResetPassword = async (userId) => {
    const newPass = prompt('Enter new password for this user (min 6 chars):');
    if (!newPass) return;
    if (newPass.length < 6) return alert('Password must be at least 6 characters.');
    
    try {
      await updateUserApi(userId, { password: newPass });
      alert('Password reset successfully.');
    } catch (err) {
      alert('Failed to reset password');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await createUserApi(newUser);
      setShowAddModal(false);
      setNewUser({ name: '', email: '', password: '', role: 'Student', identifier: '', department: 'CSE' });
      showToast('User created successfully.');
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create user');
    }
  };

  const filteredUsers = users.filter(u => {
    const matchRole = filterRole ? u.role === filterRole : true;
    const matchSearch = search ? (u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()) || (u.identifier||'').toLowerCase().includes(search.toLowerCase())) : true;
    return matchRole && matchSearch;
  });

  const studentsCount = users.filter(u => u.role === 'Student').length;
  const profsCount = users.filter(u => u.role === 'Professor').length;
  const adminsCount = users.filter(u => u.role === 'Admin').length;

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="User Management" subtitle="Manage students, professors, and admins" />
        <main className="page-content">
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 className="page-title">User Management</h2>
              <p className="page-subtitle">Add, edit, and manage all department users.</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" onClick={() => setShowPromoteModal(true)}><ArrowUpRight size={16} /> Promote Batch</button>
              <button className="btn btn-primary" onClick={() => setShowAddModal(true)}><Plus size={16} /> Add User</button>
            </div>
          </div>

          <div className="grid grid-cols-3 stagger" style={{ gap: 14, marginBottom: 20 }}>
            <div className="stat-card" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 14, padding: '16px 20px' }}>
              <div className="stat-icon" style={{ background: '#fef0e6' }}><GraduationCap size={20} color="#e8710a" /></div>
              <div><div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Students</div><div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{studentsCount}</div></div>
            </div>
            <div className="stat-card" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 14, padding: '16px 20px' }}>
              <div className="stat-icon" style={{ background: '#e6f4ea' }}><BookOpenCheck size={20} color="#1e8e3e" /></div>
              <div><div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Professors</div><div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{profsCount}</div></div>
            </div>
            <div className="stat-card" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 14, padding: '16px 20px' }}>
              <div className="stat-icon" style={{ background: '#e8f0fe' }}><Shield size={20} color="#1a73e8" /></div>
              <div><div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Admins</div><div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{adminsCount}</div></div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16, padding: '16px 20px' }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                <input className="form-input" style={{ paddingLeft: 36 }} placeholder="Search by name, email, or PRN..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select className="form-select" style={{ width: 'auto', minWidth: 140 }} value={filterRole} onChange={e => setFilterRole(e.target.value)}>
                <option value="">All Roles</option>
                <option value="Admin">Admin</option>
                <option value="Professor">Professor</option>
                <option value="Student">Student</option>
              </select>
            </div>
          </div>

          <div className="table-wrapper animate-fade-in">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Identifier</th>
                  <th>Semester</th>
                  <th>Role</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}><div className="spinner spinner-dark" style={{ margin: '0 auto'}}/></td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                        <Users size={32} color="var(--text-tertiary)" />
                        <span>No users found</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.map(u => (
                  <tr key={u._id}>
                    <td style={{ fontWeight: 600 }}>{u.name}</td>
                    <td>{u.email}</td>
                    <td><span className="badge badge-neutral">{u.identifier || '—'}</span></td>
                    <td>
                      {u.role === 'Student' ? (
                        <select
                          className="form-select"
                          style={{ padding: '4px 10px', fontSize: '0.75rem', width: '80px' }}
                          value={u.currentSemester || ''}
                          onChange={(e) => handleSemChange(u._id, e.target.value)}
                        >
                          {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Sem {s}</option>)}
                        </select>
                      ) : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                    </td>
                    <td>
                      <select 
                        className="form-select"  
                        style={{ padding: '4px 10px', fontSize: '0.75rem', width: '120px' }}
                        value={u.role}
                        onChange={(e) => handleRoleChange(u._id, e.target.value)}
                      >
                        <option value="Admin">Admin</option>
                        <option value="Professor">Professor</option>
                        <option value="Student">Student</option>
                      </select>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleResetPassword(u._id)}>
                        <Key size={14} /> Reset Pass
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add User Modal */}
          {showAddModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
              <form onSubmit={handleCreateUser} className="card animate-fade-in" style={{ width: 400, background: 'white' }}>
                <h3 style={{ margin: '0 0 20px', fontSize: '1.25rem', fontWeight: 600 }}>Add New User</h3>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input required className="form-input" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input required type="email" className="form-input" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input required minLength="6" type="password" className="form-input" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Role</label>
                    <select className="form-select" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                      <option value="Admin">Admin</option>
                      <option value="Professor">Professor</option>
                      <option value="Student">Student</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">PRN / EmpID</label>
                    <input className="form-input" value={newUser.identifier} onChange={e => setNewUser({...newUser, identifier: e.target.value})} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 10, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary"><Check size={16}/> Create User</button>
                </div>
              </form>
            </div>
          )}

          {/* Promote Batch Modal */}
          {showPromoteModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
              <div className="card animate-fade-in" style={{ width: 350, background: 'white' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '1.125rem', fontWeight: 600 }}>Promote Students</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
                  Select a semester. All students currently in this semester will be incremented to the next semester.
                </p>
                <div className="form-group">
                  <label className="form-label">From Semester</label>
                  <select className="form-select" value={promoteSem} onChange={e => setPromoteSem(Number(e.target.value))}>
                    {[1,2,3,4,5,6,7].map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </select>
                </div>
                <div style={{ marginTop: 12, padding: '10px 12px', background: '#e8f0fe', borderRadius: 8, fontSize: '0.8125rem', color: '#1a73e8' }}>
                  Students will be moved to <strong>Semester {promoteSem + 1}</strong>.
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowPromoteModal(false)}>Cancel</button>
                  <button type="button" className="btn btn-primary" onClick={handlePromoteBatch}>Confirm Promotion</button>
                </div>
              </div>
            </div>
          )}
          
          {/* Toast Notification */}
          {toastMsg && (
            <div style={{ position: 'fixed', bottom: 20, right: 20, background: '#333', color: '#fff', padding: '12px 24px', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000, display: 'flex', alignItems: 'center', gap: 8 }} className="animate-fade-in">
              <CheckCircle size={16} color="#4caf50" />
              {toastMsg}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

import { Sidebar, Topbar } from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { UserCircle, Mail, Hash, Building2, Calendar } from 'lucide-react';

export default function StudentProfile() {
  const { user } = useAuth();
  const fields = [
    { label: 'Full Name', value: user?.name, icon: UserCircle },
    { label: 'Email', value: user?.email, icon: Mail },
    { label: 'PRN Number', value: user?.identifier || '—', icon: Hash },
    { label: 'Department', value: user?.department, icon: Building2 },
    { label: 'Current Semester', value: `Semester ${user?.currentSemester || '—'}`, icon: Calendar },
  ];
  const initials = user?.name?.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase() || '?';

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="My Profile" subtitle="Personal information" />
        <main className="page-content">
          <div className="page-header">
            <h2 className="page-title">My Profile</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20, maxWidth: 800 }}>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '32px 24px', textAlign: 'center' }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#fef0e6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', fontWeight: 700, color: '#e8710a' }}>{initials}</div>
              <div>
                <h3 style={{ margin: '0 0 4px', fontWeight: 700 }}>{user?.name}</h3>
                <span className="badge badge-at-risk">Student</span>
              </div>
              <div style={{ width: '100%', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <p style={{ margin: '0 0 4px', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>PRN</p>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9375rem' }}>{user?.identifier || '—'}</p>
              </div>
            </div>
            <div className="card">
              <h3 style={{ margin: '0 0 20px', fontWeight: 600, fontSize: '1rem' }}>Academic Information</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {fields.map(({ label, value, icon: Icon }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={16} color="var(--text-secondary)" />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{label}</p>
                      <p style={{ margin: 0, fontWeight: 500, color: 'var(--text-primary)' }}>{value || '—'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

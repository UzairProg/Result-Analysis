import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginApi } from '../api/api';
import { Award, Shield, GraduationCap, BookOpenCheck, Eye, EyeOff, Mail, Lock } from 'lucide-react';

const DEMO_ACCOUNTS = [
  { role: 'Admin', email: 'admin@cse.edu', password: 'admin123', icon: Shield, color: '#1a73e8', bg: '#e8f0fe', desc: 'Full system access' },
  { role: 'Professor', email: 'prof@cse.edu', password: 'prof123', icon: BookOpenCheck, color: '#1e8e3e', bg: '#e6f4ea', desc: 'Marks entry & analytics' },
  { role: 'Student', email: 'student@cse.edu', password: 'student123', icon: GraduationCap, color: '#e8710a', bg: '#fef0e6', desc: 'View grades & CGPA' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedRole, setSelectedRole] = useState(null);

  const fillDemo = (account) => {
    setEmail(account.email);
    setPassword(account.password);
    setSelectedRole(account.role);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await loginApi({ email, password });
      const { token, user } = res.data;
      login(token, user);
      const dashboardMap = { Admin: '/admin', Professor: '/professor', Student: '/student' };
      navigate(dashboardMap[user.role] || '/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div style={{ width: '100%', maxWidth: 880, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center' }}>

        {/* Left: Hero */}
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 14px', borderRadius: 20,
              background: '#e8f0fe', color: '#1a73e8',
              fontSize: '0.8125rem', fontWeight: 600, marginBottom: 20
            }}>
              <Award size={14} />
              CSE Department ERP
            </div>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#202124', lineHeight: 1.15, margin: '0 0 16px' }}>
              Result Analysis &<br />
              <span style={{ color: '#1a73e8' }}>Management System</span>
            </h1>
            <p style={{ fontSize: '1rem', color: '#5f6368', lineHeight: 1.6, margin: 0 }}>
              A comprehensive academic platform for tracking student performance, managing marks, and generating insights across all 8 semesters.
            </p>
          </div>

          {/* Feature Pills */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { icon: '📊', text: 'Automated SGPA & CGPA computation' },
              { icon: '⚠️', text: 'Smart At-Risk detection for borderline students' },
              { icon: '📋', text: 'CA1 · MSE · CA2 · EndSem marks management' },
              { icon: '🏆', text: 'Class toppers & performance analytics' },
            ].map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.875rem', color: '#5f6368' }}>
                <span style={{ fontSize: '1rem' }}>{f.icon}</span>
                {f.text}
              </div>
            ))}
          </div>

          {/* Role Cards */}
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#80868b', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
              Quick Demo Access
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {DEMO_ACCOUNTS.map((acc) => {
                const Icon = acc.icon;
                return (
                  <button
                    key={acc.role}
                    onClick={() => fillDemo(acc)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                      border: `2px solid ${selectedRole === acc.role ? acc.color : '#e8eaed'}`,
                      background: selectedRole === acc.role ? acc.bg : 'white',
                      transition: 'all 0.2s ease', textAlign: 'left',
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: acc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Icon size={18} color={acc.color} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: '#202124' }}>{acc.role}</p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#5f6368' }}>{acc.desc}</p>
                    </div>
                    <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: acc.color, fontWeight: 500 }}>
                      {selectedRole === acc.role ? '✓ Selected' : 'Use'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Login Form */}
        <div className="login-card animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="login-logo">
            <Award size={26} color="white" />
          </div>
          <h2 style={{ textAlign: 'center', margin: '0 0 6px', fontSize: '1.375rem', fontWeight: 700, color: '#202124' }}>
            Welcome back
          </h2>
          <p style={{ textAlign: 'center', margin: '0 0 28px', fontSize: '0.875rem', color: '#5f6368' }}>
            Sign in to your ResultHub account
          </p>

          {error && (
            <div className="alert alert-error">
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#80868b' }} />
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: 38 }}
                  placeholder="you@cse.edu"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#80868b' }} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingLeft: 38, paddingRight: 44 }}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#80868b', padding: 0,
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: 8 }}
              disabled={loading}
            >
              {loading ? (
                <><div className="spinner" /><span>Signing in...</span></>
              ) : 'Sign In'}
            </button>
          </form>

          <div className="divider" style={{ margin: '24px 0' }} />

          <div style={{
            background: '#f8f9fa', borderRadius: 10, padding: '14px 16px',
            border: '1px solid #e8eaed'
          }}>
            <p style={{ margin: '0 0 8px', fontSize: '0.75rem', fontWeight: 600, color: '#5f6368' }}>
              TEST CREDENTIALS
            </p>
            {DEMO_ACCOUNTS.map((acc) => (
              <div key={acc.role} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#80868b', marginBottom: 3 }}>
                <span style={{ fontWeight: 500 }}>{acc.role}:</span>
                <span>{acc.email} / {acc.password}</span>
              </div>
            ))}
          </div>

          <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#80868b', marginTop: 20, marginBottom: 0 }}>
            ResultHub v1.0 · CSE Department ERP
          </p>
        </div>

      </div>
    </div>
  );
}

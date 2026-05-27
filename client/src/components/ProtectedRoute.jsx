import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Loading spinner while auth resolves
const LoadingScreen = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div className="spinner spinner-dark" style={{ width: 32, height: 32, borderWidth: 3 }} />
  </div>
);

/**
 * ProtectedRoute: Requires authentication + optional role check
 * Usage: <ProtectedRoute allowedRoles={['Admin']}> ... </ProtectedRoute>
 */
export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their appropriate dashboard
    const dashboardMap = { Admin: '/admin', Professor: '/professor', Student: '/student' };
    return <Navigate to={dashboardMap[user.role] || '/login'} replace />;
  }

  return children;
};

/**
 * PublicRoute: Redirect authenticated users away from login
 */
export const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (user) {
    const dashboardMap = { Admin: '/admin', Professor: '/professor', Student: '/student' };
    return <Navigate to={dashboardMap[user.role] || '/'} replace />;
  }

  return children;
};

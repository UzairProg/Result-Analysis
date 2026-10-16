import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';

// Pages
import LoginPage from './pages/LoginPage';

// Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import SubjectMapping from './pages/admin/SubjectMapping';
import ResultsOverview from './pages/admin/ResultsOverview';

// Professor
import ProfessorDashboard from './pages/professor/ProfessorDashboard';
import InternalMarksEntry from './pages/professor/InternalMarksEntry';
import ExternalMarksEntry from './pages/professor/ExternalMarksEntry';
import ClassAnalysis from './pages/professor/ClassAnalysis';

// Student
import StudentDashboard from './pages/student/StudentDashboard';
import MyGrades from './pages/student/MyGrades';
import Performance from './pages/student/Performance';
import StudentProfile from './pages/student/StudentProfile';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />

          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['Admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['Admin']}><UserManagement /></ProtectedRoute>} />
          <Route path="/admin/subjects" element={<ProtectedRoute allowedRoles={['Admin']}><SubjectMapping /></ProtectedRoute>} />
          <Route path="/admin/results" element={<ProtectedRoute allowedRoles={['Admin']}><ResultsOverview /></ProtectedRoute>} />

          {/* Professor Routes */}
          <Route path="/professor" element={<ProtectedRoute allowedRoles={['Professor']}><ProfessorDashboard /></ProtectedRoute>} />
          <Route path="/professor/internals" element={<ProtectedRoute allowedRoles={['Professor']}><InternalMarksEntry /></ProtectedRoute>} />
          <Route path="/professor/external" element={<ProtectedRoute allowedRoles={['Professor']}><ExternalMarksEntry /></ProtectedRoute>} />
          <Route path="/professor/marks" element={<Navigate to="/professor/internals" replace />} />
          <Route path="/professor/analysis" element={<ProtectedRoute allowedRoles={['Professor']}><ClassAnalysis /></ProtectedRoute>} />

          {/* Student Routes */}
          <Route path="/student" element={<ProtectedRoute allowedRoles={['Student']}><StudentDashboard /></ProtectedRoute>} />
          <Route path="/student/grades" element={<ProtectedRoute allowedRoles={['Student']}><MyGrades /></ProtectedRoute>} />
          <Route path="/student/performance" element={<ProtectedRoute allowedRoles={['Student']}><Performance /></ProtectedRoute>} />
          <Route path="/student/profile" element={<ProtectedRoute allowedRoles={['Student']}><StudentProfile /></ProtectedRoute>} />

          {/* Default Redirects */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

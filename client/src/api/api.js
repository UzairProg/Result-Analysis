import axios from 'axios';

const API = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('rm_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('rm_token');
      localStorage.removeItem('rm_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const loginApi = (data) => API.post('/auth/login', data);
export const registerApi = (data) => API.post('/auth/register', data);
export const getMeApi = () => API.get('/auth/me');

// Users
export const getUsersApi = (params) => API.get('/users', { params });
export const getUserStatsApi = () => API.get('/users/stats/overview');
export const createUserApi = (data) => API.post('/users', data);
export const updateUserApi = (id, data) => API.put(`/users/${id}`, data);
export const deleteUserApi = (id) => API.delete(`/users/${id}`);
export const bulkPromoteStudentsApi = (data) => API.put('/users/promote', data);

// Subjects
export const getSubjectsApi = (params) => API.get('/subjects', { params });
export const createSubjectApi = (data) => API.post('/subjects', data);
export const updateSubjectApi = (id, data) => API.put(`/subjects/${id}`, data);
export const deleteSubjectApi = (id) => API.delete(`/subjects/${id}`);
export const getProfessorSubjectsApi = () => API.get('/subjects/professor/my-subjects');

// Results
export const upsertResultApi = (data) => API.post('/results', data);
export const bulkUpsertResultsApi = (data) => API.put('/results/bulk', data);
export const getStudentResultsApi = (studentId) => API.get(`/results/student/${studentId}`);
export const getClassResultsApi = (subjectId, params) => API.get(`/results/class/${subjectId}`, { params });
export const getSemesterResultsApi = (sem) => API.get(`/results/semester/${sem}`);
export const deleteResultApi = (id) => API.delete(`/results/${id}`);

export default API;

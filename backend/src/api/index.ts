const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export const apiRequest = async (
  endpoint: string, 
  options: RequestInit = {}
) => {
  const token = localStorage.getItem('token');
  
  const headers: any = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }
  
  return response.json();
};

// Grade endpoints
export const createGrade = (data: { studentId: string; subjectId: string; gradeType: string; score: number; maxScore?: number; comments?: string }) =>
  apiRequest('/grades', { method: 'POST', body: JSON.stringify(data) });

export const getStudentGrades = (studentId: string) =>
  apiRequest(`/grades/student/${studentId}`);

export const updateGrade = (id: string, data: { score: number; maxScore?: number; comments?: string }) =>
  apiRequest(`/grades/${id}`, { method: 'PUT', body: JSON.stringify(data) });

// Attendance endpoints
export const recordAttendance = (data: { studentId: string; date: string; status: string; notes?: string }) =>
  apiRequest('/attendance', { method: 'POST', body: JSON.stringify(data) });

export const getStudentAttendance = (studentId: string, startDate?: string, endDate?: string) =>
  apiRequest(`/attendance/student/${studentId}?startDate=${startDate}&endDate=${endDate}`);

// Dashboard
export const getDashboardStats = () =>
  apiRequest('/dashboard/stats');

// Auth
export const login = (email: string, password: string) =>
  apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });

export const register = (data: any) =>
  apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(data) });
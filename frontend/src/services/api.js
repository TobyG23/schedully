import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor para agregar token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // No redirigir al login para rutas de timeclock (son públicas)
    const isTimeclockRoute = error.config?.url?.includes('/timeclock/');

    if (error.response?.status === 401 && !isTimeclockRoute) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  getMe: () => api.get('/auth/me'),
  changePassword: (currentPassword, newPassword) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
};

// Users
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getOne: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

// Locations
export const locationsAPI = {
  getAll: () => api.get('/locations'),
  getOne: (id) => api.get(`/locations/${id}`),
  create: (data) => api.post('/locations', data),
  update: (id, data) => api.put(`/locations/${id}`, data),
  delete: (id) => api.delete(`/locations/${id}`),
};

// Positions
export const positionsAPI = {
  getAll: () => api.get('/positions'),
  getOne: (id) => api.get(`/positions/${id}`),
  create: (data) => api.post('/positions', data),
  update: (id, data) => api.put(`/positions/${id}`, data),
  delete: (id) => api.delete(`/positions/${id}`),
};

// Shifts
export const shiftsAPI = {
  getAll: (params) => api.get('/shifts', { params }),
  getOne: (id) => api.get(`/shifts/${id}`),
  create: (data) => api.post('/shifts', data),
  createBulk: (shifts) => api.post('/shifts/bulk', { shifts }),
  update: (id, data) => api.put(`/shifts/${id}`, data),
  delete: (id) => api.delete(`/shifts/${id}`),
  copyWeek: (data) => api.post('/shifts/copy-week', data),
  publish: (data) => api.post('/shifts/publish', data),
  claim: (id) => api.post(`/shifts/${id}/claim`),
};

// Timesheets
export const timesheetsAPI = {
  getAll: (params) => api.get('/timesheets', { params }),
  clockIn: (locationId, shiftId) => api.post('/timesheets/clock-in', { locationId, shiftId }),
  clockOut: () => api.post('/timesheets/clock-out'),
  startBreak: () => api.post('/timesheets/break/start'),
  endBreak: () => api.post('/timesheets/break/end'),
  getStatus: () => api.get('/timesheets/status'),
  approve: (id) => api.post(`/timesheets/${id}/approve`),
  reject: (id, reason) => api.post(`/timesheets/${id}/reject`, { reason }),
};

// Dashboard
export const dashboardAPI = {
  getOverview: () => api.get('/dashboard/overview'),
  getLocationStats: (locationId, params) => api.get(`/dashboard/location/${locationId}/stats`, { params }),
  getTodayShifts: () => api.get('/dashboard/today-shifts'),
  getAlerts: () => api.get('/dashboard/alerts'),
};

// Time Off
export const timeOffAPI = {
  getAll: (params) => api.get('/time-off', { params }),
  getPendingCount: () => api.get('/time-off/pending-count'),
  create: (data) => api.post('/time-off', data),
  approve: (id) => api.post(`/time-off/${id}/approve`),
  reject: (id, reason) => api.post(`/time-off/${id}/reject`, { reason }),
  cancel: (id) => api.post(`/time-off/${id}/cancel`),
};

// TimeClock (rutas publicas para tablets - sin autenticacion)
export const timeclockAPI = {
  getInfo: (token) => api.get(`/timeclock/${token}/info`),
  getEmployees: (token) => api.get(`/timeclock/${token}/employees`),
  getStatus: (token, employeeId) => api.get(`/timeclock/${token}/status/${employeeId}`),
  verifyPin: (token, employeeId, pin) => api.post(`/timeclock/${token}/verify-pin`, { employeeId, pin }),
  clockIn: (token, employeeId) => api.post(`/timeclock/${token}/clock-in`, { employeeId }),
  clockOut: (token, employeeId) => api.post(`/timeclock/${token}/clock-out`, { employeeId }),
  breakStart: (token, employeeId) => api.post(`/timeclock/${token}/break-start`, { employeeId }),
  breakEnd: (token, employeeId) => api.post(`/timeclock/${token}/break-end`, { employeeId }),
  getToday: (token) => api.get(`/timeclock/${token}/today`),
};

export default api;

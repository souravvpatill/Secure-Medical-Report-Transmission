import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Automatically inject Bearer token into requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  login: async (username, password) => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    const response = await api.post('/auth/token', formData);
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
    }
    return response.data;
  },
  getMe: () => api.get('/auth/me'),
  logout: () => {
    localStorage.removeItem('token');
  },
};

export const adminService = {
  createEntity: (entityData) => api.post('/admin/entities', entityData),
  createUser: (userData) => api.post('/admin/users', userData),
  listEntities: () => api.get('/entities'),
};

export const reportService = {
  upload: (entityId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/reports/upload?receiver_entity_id=${entityId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  list: () => api.get('/reports/list'),
  download: async (reportId, filename) => {
    const response = await api.get(`/reports/download/${reportId}`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
};

export default api;

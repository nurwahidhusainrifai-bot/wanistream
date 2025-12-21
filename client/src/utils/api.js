import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth
export const auth = {
    login: (credentials) => api.post('/auth/login', credentials),
    getMe: () => api.get('/auth/me')
};

// YouTube
export const youtube = {
    getAuthUrl: () => api.get('/youtube/auth-url'),
    getAccounts: () => api.get('/youtube/accounts'),
    deleteAccount: (id) => api.delete(`/youtube/accounts/${id}`),
    setActiveAccount: (id) => api.put(`/youtube/accounts/${id}/active`),
    upload: (formData, onProgress) => api.post('/youtube/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
            if (onProgress) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(percentCompleted);
            }
        }
    }),
    syncStats: () => api.post('/youtube/sync')
};

// Streams
export const streams = {
    create: (formData) => api.post('/streams/manual', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    getActive: () => api.get('/streams/active'),
    getScheduled: () => api.get('/streams/scheduled'),
    getHistory: (params) => api.get('/streams/history', { params }),
    getStats: () => api.get('/streams/stats'),
    end: (id) => api.put(`/streams/${id}/end`),
    edit: (id, data) => api.put(`/streams/${id}/edit`, data),
    restream: (id, data) => api.post(`/streams/${id}/restream`, data),
    delete: (id) => api.delete(`/streams/${id}`)
};

// System
export const system = {
    getStats: () => api.get('/system/stats')
};

// Videos
export const videos = {
    getAll: () => api.get('/videos'),
    upload: (formData, onProgress) => api.post('/videos/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
            if (onProgress) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(percentCompleted);
            }
        }
    }),
    update: (id, data) => api.put(`/videos/${id}`, data),
    delete: (id) => api.delete(`/videos/${id}`)
};

export default api;

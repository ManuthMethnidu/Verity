import axios from 'axios';

const TOKEN_KEY = 'verity_auth_token';
const USER_KEY = 'verity_auth_user';

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept requests to attach Bearer token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercept responses to handle 401 / expired token
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if expired or unauthorized
      if (window.location.pathname !== '/login') {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export async function signIn(email, password) {
  const response = await api.post('/auth/login', { email, password });
  const { token, tenantId, admin } = response.data;
  
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify({ ...admin, tenantId }));
  return response.data;
}

export async function registerAdmin(email, password, tenantName) {
  const response = await api.post('/auth/register', { email, password, tenantName });
  const { token, tenantId, admin } = response.data;

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify({ ...admin, tenantId }));
  return response.data;
}

export async function createTenant(tenantName) {
  const response = await api.post('/tenant/create', { name: tenantName });
  if (response.data.token) {
    localStorage.setItem(TOKEN_KEY, response.data.token);
  }
  const user = getCurrentUser();
  if (user) {
    user.tenantId = response.data.tenantId;
    user.tenantName = response.data.name;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
  return response.data;
}

export function signOut() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.href = '/login';
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getCurrentUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return Boolean(getToken());
}

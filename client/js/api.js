// ===== API UTILITY =====
const API_BASE = window.location.port === '3001'
  ? 'http://localhost:5000/api'
  : '/api';

const api = {
  getToken() { return localStorage.getItem('medirec_token'); },

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.getToken()}`
    };
  },

  async request(method, endpoint, body = null) {
    const options = {
      method,
      headers: this.getHeaders()
    };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await res.json();

    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  },

  get: (endpoint) => api.request('GET', endpoint),
  post: (endpoint, body) => api.request('POST', endpoint, body),
  patch: (endpoint, body) => api.request('PATCH', endpoint, body),
  delete: (endpoint) => api.request('DELETE', endpoint),
};

// Auth helpers
function getUser() {
  const u = localStorage.getItem('medirec_user');
  return u ? JSON.parse(u) : null;
}

function logout() {
  localStorage.removeItem('medirec_token');
  localStorage.removeItem('medirec_user');
  window.location.href = '/';
}

function requireAuth(role) {
  const token = localStorage.getItem('medirec_token');
  const user = getUser();
  if (!token || !user) {
    window.location.href = '/';
    return false;
  }
  if (role && user.role !== role) {
    window.location.href = '/';
    return false;
  }
  return true;
}

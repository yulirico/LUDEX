const BASE = '/api';

function getToken() {
  return localStorage.getItem('ludex_token');
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  let data = null;
  try { data = await res.json(); } catch (e) { /* sin cuerpo */ }

  if (!res.ok) {
    const err = new Error((data && data.error) || 'Error de red');
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  login: (username, password) => request('/auth/login', { method: 'POST', body: { username, password } }),
  me: () => request('/auth/me'),

  diagnosticStatus: () => request('/progress/diagnostic/status'),
  diagnosticQuestions: () => request('/progress/diagnostic/questions'),
  diagnosticSubmit: (answers) => request('/progress/diagnostic/submit', { method: 'POST', body: { answers } }),

  route: () => request('/progress/route'),
  level: (id) => request(`/progress/level/${id}`),
  levelChallenges: (id) => request(`/progress/level/${id}/challenges`),
  attemptChallenge: (id, selected) => request(`/progress/challenges/${id}/attempt`, { method: 'POST', body: { selected } }),
  advanceStage: (id) => request(`/progress/level/${id}/advance-stage`, { method: 'POST' }),
  levelResults: (id) => request(`/progress/level/${id}/results`),

  teacherSummary: (group) => request(`/teacher/summary${group ? `?group=${encodeURIComponent(group)}` : ''}`),
  teacherStudent: (id) => request(`/teacher/student/${id}`),

  adminUsers: () => request('/admin/users'),
  adminCreateUser: (payload) => request('/admin/users', { method: 'POST', body: payload }),
  adminUpdateUser: (id, payload) => request(`/admin/users/${id}`, { method: 'PUT', body: payload }),
  adminDeleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
  adminContent: () => request('/admin/content')
};

export { getToken };
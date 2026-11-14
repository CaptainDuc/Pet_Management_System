const API_BASE = import.meta.env.VITE_NOTIFICATION_URL || 'http://localhost:8083/api/v1';

async function request(endpoint, { method = 'GET', token } = {}) {
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, { method, headers });
  } catch {
    const error = new Error('Không thể kết nối đến máy chủ thông báo.');
    error.status = 0;
    throw error;
  }

  let payload = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    payload = await response.json();
  }

  if (!response.ok) {
    const error = new Error(payload?.message || `Yêu cầu thất bại (HTTP ${response.status})`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload?.data;
}

export const notificationApi = {
  list(token, params = {}) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        search.set(key, value);
      }
    });
    const qs = search.toString();
    return request(`/notifications${qs ? `?${qs}` : ''}`, { token });
  },

  unreadCount(token) {
    return request('/notifications/unread-count', { token });
  },

  markRead(id, token) {
    return request(`/notifications/${id}`, { method: 'PATCH', token });
  },

  markAllRead(token) {
    return request('/notifications/read-all', { method: 'PATCH', token });
  },
};

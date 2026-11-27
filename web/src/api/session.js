import { authApi } from './auth';

let pendingRefresh;

function clearExpiredSession() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  window.dispatchEvent(new Event('petcare-auth-updated'));
}

export function refreshAccessToken() {
  if (pendingRefresh) return pendingRefresh;
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    clearExpiredSession();
    return Promise.reject(new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'));
  }
  pendingRefresh = authApi.refreshToken(refreshToken).then(session => {
    if (!session?.accessToken) throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    localStorage.setItem('accessToken', session.accessToken);
    if (session.refreshToken) localStorage.setItem('refreshToken', session.refreshToken);
    if (session.user) localStorage.setItem('user', JSON.stringify(session.user));
    window.dispatchEvent(new Event('petcare-auth-updated'));
    return session.accessToken;
  }).catch(error => {
    if ([400, 401, 403, 422, 423].includes(error.status)) {
      clearExpiredSession();
    }
    throw error;
  }).finally(() => { pendingRefresh = null; });
  return pendingRefresh;
}

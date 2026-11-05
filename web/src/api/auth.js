const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

/**
 * Standard fetch helper with error normalization
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    let data = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    }

    if (!response.ok) {
      // Backend error response standard:
      // - 400 Validation: { status: 400, success: false, message: "Validation error", data: { field: "message" } }
      // - 401 Bad credentials: { status: 401, success: false, message: "Invalid credentials" }
      // - 422 Business error: { status: 422, success: false, message: "Email already registered" }
      const errorMessage = data?.message || `Yêu cầu thất bại với mã lỗi HTTP ${response.status}`;
      const fieldErrors = data?.data && typeof data.data === 'object' && !Array.isArray(data.data) ? data.data : {};

      const error = new Error(errorMessage);
      error.status = response.status;
      error.fieldErrors = fieldErrors;
      error.payload = data;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      const netError = new Error('Không thể kết nối đến máy chủ backend (http://localhost:8080). Vui lòng kiểm tra dịch vụ.');
      netError.status = 0;
      throw netError;
    }
    throw err;
  }
}

export const authApi = {
  /**
   * POST /api/v1/auth/login
   * @param {{ email: string, password: string }} credentials
   */
  async login(credentials) {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: credentials.email.trim(),
        password: credentials.password,
      }),
    });
    // Response envelope: { status: 200, success: true, message: "Success", data: AuthResponse }
    return res.data;
  },

  /**
   * POST /api/v1/auth/register
   * @param {{ fullName: string, email: string, password: string, phone?: string }} payload
   */
  async register(payload) {
    const body = {
      fullName: payload.fullName.trim(),
      email: payload.email.trim(),
      password: payload.password,
    };
    if (payload.phone && payload.phone.trim()) {
      body.phone = payload.phone.trim();
    }

    const res = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return res.data;
  },

  /**
   * POST /api/v1/auth/refresh
   * @param {string} refreshToken
   */
  async refreshToken(refreshToken) {
    const res = await request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
    return res.data;
  },

  /**
   * POST /api/v1/auth/logout
   * @param {{ refreshToken?: string, logoutAll?: boolean }} payload
   * @param {string} [accessToken]
   */
  async logout(payload, accessToken) {
    const headers = {};
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    const res = await request('/auth/logout', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        refreshToken: payload?.refreshToken || null,
        logoutAll: Boolean(payload?.logoutAll),
      }),
    });
    return res.data;
  },

  /**
   * GET /api/v1/users/me
   */
  async getProfile(accessToken) {
    const res = await request('/users/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return res.data;
  },
};

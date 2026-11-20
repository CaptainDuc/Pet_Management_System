const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

async function request(endpoint, { method = "GET", token, body } = {}) {
  const headers = {};
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    const error = new Error(
      "Không thể kết nối đến máy chủ backend (http://localhost:8000)."
    );
    error.status = 0;
    throw error;
  }

  let payload = null;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    payload = await response.json();
  }

  if (!response.ok) {
    const error = new Error(
      payload?.message || `Yêu cầu thất bại (HTTP ${response.status})`
    );
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload?.data;
}

function query(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, value);
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const clinicApi = {
  listPets(token) {
    return request(`/pets${query({ page: 0, size: 50 })}`, { token });
  },

  createPet(payload, token) {
    return request("/pets", { method: "POST", token, body: payload });
  },

  updatePet(id, payload, token) {
    return request(`/pets/${id}`, { method: "PUT", token, body: payload });
  },

  listServices(token) {
    return request(`/services${query({ page: 0, size: 50 })}`, { token });
  },

  listBookings(token, params = {}) {
    return request(`/bookings${query({ page: 0, size: 50, ...params })}`, {
      token,
    });
  },

  createBooking(payload, token) {
    return request("/bookings", { method: "POST", token, body: payload });
  },

  availableSlots(params, token) {
    return request(`/schedules/slots/available${query(params)}`, { token });
  },

  validatePromotion(code, bookingTotal, token) {
    return request("/promotions/validate", {
      method: "POST",
      token,
      body: { code, bookingTotal },
    });
  },

  markBookingPaid(id, token) {
    return request(`/bookings/${id}/mark-paid`, { method: "POST", token });
  },

  reportBookingIssue(id, message, token) {
    return request(`/bookings/${id}/report`, {
      method: "POST",
      token,
      body: { message },
    });
  },

  cancelBooking(id, reason, token) {
    return request(`/bookings/${id}/cancel`, {
      method: 'POST',
      token,
      body: { reason: reason || 'Khách hàng hủy lịch hẹn' },
    });
  },
};

export const invoiceApi = {
  listInvoices(token, params = {}) {
    return request(`/invoices${query({ page: 0, size: 50, ...params })}`, {
      token,
    });
  },

  issueInvoice(bookingId, token) {
    return request("/invoices", { method: "POST", token, body: { bookingId } });
  },

  getByBooking(bookingId, token) {
    return request(`/invoices/by-booking/${bookingId}`, { token });
  },
};

export const promotionApi = {
  list(token) {
    return request('/promotions', { token });
  },

  get(id, token) {
    return request(`/promotions/${id}`, { token });
  },

  create(payload, token) {
    return request('/promotions', { method: 'POST', token, body: payload });
  },

  update(id, payload, token) {
    return request(`/promotions/${id}`, { method: 'PUT', token, body: payload });
  },

  toggle(id, token) {
    return request(`/promotions/${id}/toggle`, { method: 'PATCH', token });
  },

  delete(id, token) {
    return request(`/promotions/${id}`, { method: 'DELETE', token });
  },

  validate(code, bookingTotal, token) {
    return request('/promotions/validate', {
      method: 'POST',
      token,
      body: { code, bookingTotal },
    });
  },
};

const PAYMENT_BASE =
  import.meta.env.VITE_PAYMENT_URL || "http://localhost:8000/api/v1";
import { refreshAccessToken } from './session';

async function request(endpoint, { method = "GET", body } = {}) {
  const token = localStorage.getItem("accessToken");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  let response;
  try {
    response = await fetch(`${PAYMENT_BASE}${endpoint}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (response.status === 401 && token) {
      const freshToken = await refreshAccessToken();
      response = await fetch(`${PAYMENT_BASE}${endpoint}`, {
        method,
        headers: { ...headers, Authorization: `Bearer ${freshToken}` },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    }
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    const networkError = new Error(
      "Không thể kết nối đến payment-service (http://localhost:8000)."
    );
    networkError.status = 0;
    throw networkError;
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

  return payload;
}

export const paymentApi = {
  createPayment({ amount, bookingId, invoiceId, invoiceCode, description }) {
    return request("/payments/create", {
      method: "POST",
      body: { amount, bookingId, invoiceId, invoiceCode, description },
    });
  },

  orderStatus(orderCode) {
    return request(`/orders/${encodeURIComponent(orderCode)}/status`);
  },
};

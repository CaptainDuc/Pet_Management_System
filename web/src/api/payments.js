const PAYMENT_BASE =
  import.meta.env.VITE_PAYMENT_URL || "http://localhost:8000/api/v1";

async function request(endpoint, { method = "GET", body } = {}) {
  const headers = {};
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
  } catch {
    const error = new Error(
      "Không thể kết nối đến payment-service (http://localhost:8000)."
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

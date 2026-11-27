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

async function listAll(endpoint, token) {
  const rows = [];
  let page = 0;
  let result;
  do {
    result = await request(`${endpoint}${query({ page, size: 50 })}`, { token });
    rows.push(...result.content);
    page += 1;
  } while (page < result.totalPages);
  return rows;
}

export const clinicApi = {
  publicReviews: () => request('/reviews/public'),
  myReview: (id, token) => request('/reviews/' + id, { token }),
  submitReview: (id, token, body) => request('/reviews/' + id, { token, method: 'POST', body }),
  myAttendance(token) {
    return request('/schedules/attendance/me', { token });
  },
  clockShift(token, body) {
    return request('/schedules/attendance/me', { method: 'PUT', token, body });
  },
  doctorRoster(token) {
    return request('/staff/doctors', { token });
  },

  staffBranches(token) {
    return listAll('/branches', token);
  },

  createStaffProfile(body, token) {
    return request('/staff', { method: 'POST', body, token });
  },

  getBooking(id, token) {
    return request(`/bookings/${id}`, { token });
  },

  pendingAssignments(token) {
    return request('/bookings/queue/pending', { token });
  },

  assignmentOptions(visit, token) {
    return request(`/bookings/queue/${visit.bookingId}/${visit.itemId}/candidates`, { token });
  },

  assignVisit(visit, targetSlotId, customerAgreed, token) {
    return request(`/bookings/queue/${visit.bookingId}/${visit.itemId}/assign`, {
      method: 'POST', token, body: { expectedSlotId: visit.slotId, targetSlotId, customerAgreed },
    });
  },

  visitQueue(date, mine, token) {
    return request(`/bookings/queue${mine ? '/mine' : ''}${query({ date })}`, { token });
  },

  findClientPets(contact, token) {
    return request('/bookings/queue/client-pets', { method: 'POST', body: { contact }, token });
  },

  clients(search, token) {
    return request(`/bookings/queue/clients${query({ search })}`, { token });
  },

  walkIn(customerId, body, token) {
    return request(`/bookings/queue/walk-in/${customerId}`, { method: 'POST', body, token });
  },

  visitAction(visit, action, token) {
    return request(`/bookings/queue/${visit.bookingId}/${visit.itemId}/${action}`, {
      method: 'POST', body: action === 'check-in' ? { slotId: visit.slotId } : undefined, token,
    });
  },

  markNoShow(bookingId, token) {
    return request(`/bookings/queue/${bookingId}/no-show`, { method: 'POST', token });
  },

  ownerReport(token) {
    return request('/analytics/dashboard', { token });
  },

  listPets(token) {
    return request(`/pets${query({ page: 0, size: 50 })}`, { token });
  },

  getPet(id, token) {
    return request(`/pets/${id}`, { token });
  },

  createPet(payload, token) {
    return request("/pets", { method: "POST", token, body: payload });
  },

  updatePet(id, payload, token) {
    return request(`/pets/${id}`, { method: "PUT", token, body: payload });
  },

  deletePet(id, token) {
    return request(`/pets/${id}`, { method: "DELETE", token });
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

  availableDoctors(params, token) {
    return request(`/schedules/doctors/available${query(params)}`, { token });
  },

  moveOptions(bookingId, itemId, date, token) {
    return request(`/bookings/${bookingId}/items/${itemId}/slots${query({ date })}`, { token });
  },

  reschedule(bookingId, itemId, expectedSlotId, timeSlotId, token) {
    return request(`/bookings/${bookingId}/items/${itemId}/reschedule`, {
      method: 'POST', token, body: { expectedSlotId, timeSlotId },
    });
  },

  shiftStaff(token) {
    return request('/schedules/staff', { token });
  },

  shifts(date, token) {
    return request(`/schedules${query({ dateFrom: date, dateTo: date })}`, { token });
  },

  createShift(body, token) {
    return request('/schedules', { method: 'POST', body, token });
  },

  setShiftAvailability(id, available, token) {
    return request(`/schedules/${id}/availability`, { method: 'PATCH', body: { available }, token });
  },

  shiftBookings(id, token) {
    return request(`/bookings/by-shift/${id}`, { token });
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

export const medicalApi = {
  listRecordsByPet(petId, token) {
    return request(`/medical/records/pet/${petId}`, { token });
  },

  getRecord(id, token) {
    return request(`/medical/records/${id}`, { token });
  },

  createRecord(body, token) {
    return request('/medical/records', { method: 'POST', body, token });
  },

  updateRecord(id, body, token) {
    return request(`/medical/records/${id}`, { method: 'PUT', body, token });
  },

  listVaccinationsByPet(petId, token) {
    return request(`/medical/vaccinations/pet/${petId}`, { token });
  },

  listDueVaccinations(days = 30, token) {
    return request(`/medical/vaccinations/due${query({ days })}`, { token });
  },

  createVaccination(body, token) {
    return request('/medical/vaccinations', { method: 'POST', body, token });
  },

  updateVaccination(id, body, token) {
    return request(`/medical/vaccinations/${id}`, { method: 'PUT', body, token });
  },
};

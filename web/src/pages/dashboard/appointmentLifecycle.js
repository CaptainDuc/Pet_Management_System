const CANCELLATION_CUTOFF_MS = 30 * 60 * 1000;
const HISTORY_STATUSES = new Set(['CANCELLED', 'COMPLETED', 'NO_SHOW']);

export function canCustomerCancelAppointment(status, appointmentStart, now = new Date()) {
  const start = Date.parse(appointmentStart);
  return ['PENDING', 'CONFIRMED'].includes(status)
    && Number.isFinite(start)
    && start - now.getTime() >= CANCELLATION_CUTOFF_MS;
}

export function isActiveAppointment(status) {
  return !HISTORY_STATUSES.has(status);
}

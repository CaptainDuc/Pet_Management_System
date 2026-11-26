import test from 'node:test';
import assert from 'node:assert/strict';
import { canCustomerCancelAppointment, isActiveAppointment } from './appointmentLifecycle.js';

test('customer cancellation closes within thirty minutes of the appointment', () => {
  const now = new Date('2026-11-25T10:00:00Z');
  assert.equal(canCustomerCancelAppointment('CONFIRMED', '2026-11-25T10:31:00Z', now), true);
  assert.equal(canCustomerCancelAppointment('CONFIRMED', '2026-11-25T10:30:00Z', now), true);
  assert.equal(canCustomerCancelAppointment('CONFIRMED', '2026-11-25T10:29:00Z', now), false);
  assert.equal(canCustomerCancelAppointment('NO_SHOW', '2026-11-25T10:31:00Z', now), false);
});

test('no-show bookings are retained as history, not active appointments', () => {
  assert.equal(isActiveAppointment('CONFIRMED'), true);
  assert.equal(isActiveAppointment('NO_SHOW'), false);
  assert.equal(isActiveAppointment('CANCELLED'), false);
  assert.equal(isActiveAppointment('COMPLETED'), false);
});

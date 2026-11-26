import test from 'node:test';
import assert from 'node:assert/strict';
import { canPayBooking, paymentStatusLabel } from './bookingPayment.js';

test('only unpaid and active bookings can be paid', () => {
  assert.equal(canPayBooking('UNPAID', 'PENDING'), true);
  assert.equal(canPayBooking('UNPAID', 'CONFIRMED'), true);
  assert.equal(canPayBooking('PAID', 'CONFIRMED'), false);
  assert.equal(canPayBooking('REFUNDED', 'CONFIRMED'), false);
  assert.equal(canPayBooking('UNPAID', 'CANCELLED'), false);
  assert.equal(canPayBooking('UNPAID', 'NO_SHOW'), false);
});

test('payment status has a clear customer-facing label', () => {
  assert.equal(paymentStatusLabel('PAID'), 'Đã thanh toán');
  assert.equal(paymentStatusLabel('REFUNDED'), 'Đã hoàn tiền');
  assert.equal(paymentStatusLabel('UNPAID'), 'Chưa thanh toán');
});

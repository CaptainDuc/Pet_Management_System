const paymentLabels = {
  UNPAID: 'Chưa thanh toán',
  PAID: 'Đã thanh toán',
  REFUNDED: 'Đã hoàn tiền',
};

export function canPayBooking(paymentStatus, bookingStatus) {
  return paymentStatus === 'UNPAID' && !['CANCELLED', 'NO_SHOW'].includes(bookingStatus);
}

export function paymentStatusLabel(paymentStatus) {
  return paymentLabels[paymentStatus] || 'Chưa rõ trạng thái';
}

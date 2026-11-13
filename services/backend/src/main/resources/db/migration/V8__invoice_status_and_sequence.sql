-- Trạng thái hóa đơn, mỗi lịch hẹn một hóa đơn, và sequence cho số hóa đơn

ALTER TABLE invoices ADD COLUMN status VARCHAR(30) NOT NULL DEFAULT 'ISSUED';

ALTER TABLE invoices ADD CONSTRAINT ck_invoices_status
    CHECK (status IN ('ISSUED','PENDING_PAYMENT','PAID','PARTIALLY_PAID','CANCELLED','REFUNDED'));

ALTER TABLE invoices ADD CONSTRAINT uq_invoices_booking UNIQUE (booking_id);

CREATE INDEX idx_invoices_status ON invoices(status);

CREATE SEQUENCE invoice_number_seq START WITH 1;
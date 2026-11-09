-- Bảng outbox: sự kiện được ghi cùng giao dịch với dữ liệu nghiệp vụ

CREATE TABLE outbox_events (
    id             UUID         PRIMARY KEY,
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id   UUID         NOT NULL,
    exchange_name  VARCHAR(150) NOT NULL,
    event_type     VARCHAR(150) NOT NULL,
    payload        TEXT         NOT NULL,
    occurred_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    published_at   TIMESTAMPTZ
);

CREATE INDEX idx_outbox_events_unpublished
    ON outbox_events(occurred_at) WHERE published_at IS NULL;
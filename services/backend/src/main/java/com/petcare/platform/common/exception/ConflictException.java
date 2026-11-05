package com.petcare.platform.common.exception;

/** Xung đột trạng thái, ví dụ khung giờ đã có người đặt. Trả về HTTP 409. */
public class ConflictException extends RuntimeException {

    public ConflictException(String message) {
        super(message);
    }
}
package com.petcare.platform.auth.service;

import com.petcare.platform.common.exception.BusinessException;

/** Failed verification attempts must commit without committing any user changes. */
public class InvalidEmailCodeException extends BusinessException {
    public InvalidEmailCodeException() {
        super("Mã xác nhận không đúng, đã hết hạn hoặc đã được sử dụng. Vui lòng kiểm tra hoặc gửi lại mã.");
    }
}

package com.petcare.platform.auth.dto;

public record EmailChallengeResponse(java.util.UUID challengeId, String email, int expiresInSeconds, int resendAfterSeconds, String message) {}

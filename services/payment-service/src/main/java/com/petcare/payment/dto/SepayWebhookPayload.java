package com.petcare.payment.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;

/**
 * Payload sent by SePay to the webhook endpoint.
 *
 * @see <a href="https://sepay.vn">SePay webhook documentation</a>
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record SepayWebhookPayload(
        @JsonProperty("id") Long id,
        @JsonProperty("gateway") String gateway,
        @JsonProperty("transactionDate") String transactionDate,
        @JsonProperty("accountNumber") String accountNumber,
        @JsonProperty("subAccount") String subAccount,
        @JsonProperty("code") String code,
        @JsonProperty("content") String content,
        @JsonProperty("transferType") String transferType,
        @JsonProperty("transferAmount") BigDecimal transferAmount,
        @JsonProperty("accumulated") BigDecimal accumulated,
        @JsonProperty("referenceCode") String referenceCode,
        @JsonProperty("description") String description
) {
}

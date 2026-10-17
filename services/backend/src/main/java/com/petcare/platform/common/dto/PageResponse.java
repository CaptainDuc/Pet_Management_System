package com.petcare.platform.common.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import org.springframework.data.domain.Page;

import java.util.List;

@Schema(description = "Paginated response wrapper")
public record PageResponse<T>(
        @Schema(description = "Page content") List<T> content,
        @Schema(description = "Current page number (0-based)") int page,
        @Schema(description = "Page size") int size,
        @Schema(description = "Total elements count") long totalElements,
        @Schema(description = "Total pages count") int totalPages,
        @Schema(description = "Is last page") boolean last,
        @Schema(description = "Is first page") boolean first
) {
    public static <T> PageResponse<T> from(Page<T> page) {
        return new PageResponse<>(
                page.getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.isLast(),
                page.isFirst()
        );
    }
}

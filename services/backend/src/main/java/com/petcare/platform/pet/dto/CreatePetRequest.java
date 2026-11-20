package com.petcare.platform.pet.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Schema(description = "Create pet request")
public record CreatePetRequest(
        @Schema(description = "Pet name") @NotBlank String name,
        @Schema(description = "Species") @NotBlank String species,
        @Schema(description = "Breed ID") UUID breedId,
        @Schema(description = "Gender") String gender,
        @Schema(description = "Date of birth") LocalDate dateOfBirth,
        @Schema(description = "Weight (kg)") BigDecimal weight,
        @Schema(description = "Photo URL or bounded JPEG profile thumbnail")
        @Size(max = 350000, message = "Ảnh hồ sơ quá lớn")
        @Pattern(regexp = "^(https?://[^\\s]{1,493}|data:image/jpeg;base64,/9j/[A-Za-z0-9+/]*={0,2})?$",
                message = "Ảnh phải là đường dẫn HTTP/HTTPS hoặc ảnh JPEG hợp lệ") String photoUrl,
        @Schema(description = "Notes") String notes
) {}

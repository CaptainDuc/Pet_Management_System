package com.petcare.platform.medical.domain;

import com.petcare.platform.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "vaccinations")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Vaccination extends BaseEntity {
    private UUID petId;
    private String vaccineName;
    private LocalDate administeredDate;
    private LocalDate nextDueDate;
}

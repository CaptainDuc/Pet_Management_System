package com.petcare.platform.medical.domain;

import com.petcare.platform.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "medical_records")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MedicalRecord extends BaseEntity {
    private UUID petId;
    private String diagnosis;
    private String treatment;
    private LocalDate visitDate;
}

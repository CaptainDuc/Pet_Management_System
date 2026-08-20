package com.petcare.platform.loyalty.domain;

import com.petcare.platform.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "loyalty")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Loyalty extends BaseEntity {
    private UUID customerId;
    private Integer points;
}

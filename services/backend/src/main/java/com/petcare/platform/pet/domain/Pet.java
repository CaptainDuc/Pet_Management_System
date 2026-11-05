package com.petcare.platform.pet.domain;

import com.petcare.platform.common.domain.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "pets")
@Getter
@Setter
@NoArgsConstructor
public class Pet extends BaseEntity {

    @Column(name = "owner_id", nullable = false)
    private UUID ownerId;

    @Column(name = "breed_id")
    private UUID breedId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String species;

    private String gender;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    private BigDecimal weight;

    @Column(name = "photo_url")
    private String photoUrl;

    private String notes;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;
}
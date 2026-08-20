package com.petcare.platform.inventory.domain;

import com.petcare.platform.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "inventory_items")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class InventoryItem extends BaseEntity {
    private UUID branchId;
    private String name;
    private String sku;
    private BigDecimal quantity;
    private BigDecimal minQuantity;
    private String unit;
}

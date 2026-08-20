package com.petcare.platform.inventory.service;

import com.petcare.platform.inventory.domain.InventoryItem;
import com.petcare.platform.inventory.repository.InventoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InventoryService {

    private final InventoryRepository inventoryRepository;

    public List<InventoryItem> getAllItems() {
        return inventoryRepository.findAll();
    }

    public InventoryItem getItemById(UUID id) {
        return inventoryRepository.findById(id).orElse(null);
    }

    public InventoryItem saveItem(InventoryItem item) {
        return inventoryRepository.save(item);
    }
}

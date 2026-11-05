package com.petcare.platform.servicecatalog.service;

import com.petcare.platform.common.exception.ResourceNotFoundException;
import com.petcare.platform.servicecatalog.domain.CareService;
import com.petcare.platform.servicecatalog.domain.ServiceCategory;
import com.petcare.platform.servicecatalog.dto.CategoryResponse;
import com.petcare.platform.servicecatalog.dto.CreateCategoryRequest;
import com.petcare.platform.servicecatalog.dto.CreateServiceRequest;
import com.petcare.platform.servicecatalog.dto.ServiceResponse;
import com.petcare.platform.servicecatalog.repository.CareServiceRepository;
import com.petcare.platform.servicecatalog.repository.ServiceCategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CatalogService {

    private final CareServiceRepository serviceRepository;
    private final ServiceCategoryRepository categoryRepository;

    // ─── Dịch vụ ───────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<ServiceResponse> listServices(UUID categoryId, String search, Pageable pageable) {
        Specification<CareService> spec =
                (root, query, cb) -> cb.isTrue(root.<Boolean>get("active"));

        if (categoryId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("categoryId"), categoryId));
        }
        if (search != null && !search.isBlank()) {
            String like = "%" + search.trim().toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.like(cb.lower(root.<String>get("name")), like));
        }
        return serviceRepository.findAll(spec, pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public ServiceResponse getService(UUID id) {
        return toResponse(findActive(id));
    }

    @Transactional
    public ServiceResponse createService(CreateServiceRequest request) {
        requireCategory(request.categoryId());
        CareService service = new CareService();
        apply(service, request);
        return toResponse(serviceRepository.save(service));
    }

    @Transactional
    public ServiceResponse updateService(UUID id, CreateServiceRequest request) {
        requireCategory(request.categoryId());
        CareService service = findActive(id);
        apply(service, request);
        return toResponse(serviceRepository.save(service));
    }

    @Transactional
    public void deactivateService(UUID id) {
        CareService service = findActive(id);
        service.setActive(false);
        serviceRepository.save(service);
    }

    // ─── Danh mục ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<CategoryResponse> listCategories() {
        return categoryRepository.findAll(Sort.by("name")).stream()
                .map(this::toResponse).toList();
    }

    @Transactional
    public CategoryResponse createCategory(CreateCategoryRequest request) {
        ServiceCategory category = new ServiceCategory();
        category.setName(request.name().trim());
        category.setDescription(request.description());
        category.setIcon(request.icon());
        return toResponse(categoryRepository.save(category));
    }

    // ─── Hàm phụ ───────────────────────────────────────────────────────────

    private CareService findActive(UUID id) {
        return serviceRepository.findByIdAndActiveTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException("Service", id));
    }

    private void requireCategory(UUID categoryId) {
        if (categoryId != null && !categoryRepository.existsById(categoryId)) {
            throw new ResourceNotFoundException("ServiceCategory", categoryId);
        }
    }

    private void apply(CareService service, CreateServiceRequest r) {
        service.setName(r.name().trim());
        service.setCategoryId(r.categoryId());
        service.setDescription(r.description());
        service.setBasePrice(r.basePrice());
        service.setDurationMinutes(r.durationMinutes());
    }

    private ServiceResponse toResponse(CareService s) {
        return new ServiceResponse(s.getId(), s.getCategoryId(), s.getName(),
                s.getDescription(), s.getBasePrice(), s.getDurationMinutes(), s.isActive());
    }

    private CategoryResponse toResponse(ServiceCategory c) {
        return new CategoryResponse(c.getId(), c.getName(), c.getDescription(), c.getIcon());
    }
}
package com.petcare.platform.branch.service;

import com.petcare.platform.branch.domain.Branch;
import com.petcare.platform.branch.dto.BranchResponse;
import com.petcare.platform.branch.dto.CreateBranchRequest;
import com.petcare.platform.branch.dto.UpdateBranchRequest;
import com.petcare.platform.branch.repository.BranchRepository;
import com.petcare.platform.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BranchService {

    private final BranchRepository branchRepository;

    @Transactional
    public BranchResponse create(CreateBranchRequest request) {
        Branch branch = new Branch();
        branch.setName(request.name());
        branch.setAddress(request.address());
        branch.setPhone(request.phone());
        branch.setEmail(request.email());
        branch.setLatitude(request.latitude());
        branch.setLongitude(request.longitude());
        branch.setActive(true);
        return toResponse(branchRepository.save(branch));
    }

    @Transactional(readOnly = true)
    public Page<BranchResponse> list(Pageable pageable) {
        return branchRepository.findAll(pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public BranchResponse get(UUID id) {
        return toResponse(find(id));
    }

    @Transactional
    public BranchResponse update(UUID id, UpdateBranchRequest request) {
        Branch branch = find(id);
        if (request.name() != null) branch.setName(request.name());
        if (request.address() != null) branch.setAddress(request.address());
        if (request.phone() != null) branch.setPhone(request.phone());
        if (request.email() != null) branch.setEmail(request.email());
        if (request.latitude() != null) branch.setLatitude(request.latitude());
        if (request.longitude() != null) branch.setLongitude(request.longitude());
        if (request.active() != null) branch.setActive(request.active());
        return toResponse(branchRepository.save(branch));
    }

    @Transactional
    public void deactivate(UUID id) {
        Branch branch = find(id);
        branch.setActive(false);
        branchRepository.save(branch);
    }

    private Branch find(UUID id) {
        return branchRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Branch", id));
    }

    private BranchResponse toResponse(Branch b) {
        return new BranchResponse(
                b.getId(), b.getName(), b.getAddress(), b.getPhone(),
                b.getEmail(), b.getLatitude(), b.getLongitude(),
                b.getActive(), b.getCreatedAt(), b.getUpdatedAt()
        );
    }
}
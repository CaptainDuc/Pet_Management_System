package com.petcare.platform.staff.service;

import com.petcare.platform.common.exception.BusinessException;
import com.petcare.platform.common.exception.ResourceNotFoundException;
import com.petcare.platform.servicecatalog.repository.CareServiceRepository;
import com.petcare.platform.staff.domain.Staff;
import com.petcare.platform.staff.domain.StaffSkill;
import com.petcare.platform.staff.dto.AssignSkillsRequest;
import com.petcare.platform.staff.dto.CreateStaffRequest;
import com.petcare.platform.staff.dto.SkillResponse;
import com.petcare.platform.staff.dto.StaffResponse;
import com.petcare.platform.staff.dto.StaffSkillsResponse;
import com.petcare.platform.staff.dto.UpdateSkillRequest;
import com.petcare.platform.staff.repository.StaffRepository;
import com.petcare.platform.staff.repository.StaffSkillRepository;
import com.petcare.platform.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StaffService {

    private static final Set<String> LEVELS = Set.of("EXPERT", "INTERMEDIATE", "BEGINNER");

    private final StaffRepository staffRepository;
    private final StaffSkillRepository skillRepository;
    private final UserRepository userRepository;
    private final CareServiceRepository careServiceRepository;

    @Transactional
    public StaffResponse create(CreateStaffRequest request) {
        if (userRepository.lockIdForStaffCreation(request.userId()).isEmpty()) {
            throw new ResourceNotFoundException("User", request.userId());
        }
        if (staffRepository.existsByUserId(request.userId())) {
            throw new BusinessException("Staff already exists for this user");
        }
        Staff staff = new Staff();
        staff.setUserId(request.userId());
        staff.setBranchId(request.branchId());
        staff.setPosition(request.position());
        staff.setBio(request.bio());
        return toResponse(staffRepository.save(staff));
    }

    @Transactional(readOnly = true)
    public List<StaffRepository.DoctorEntry> doctors() {
        return staffRepository.doctors();
    }

    @Transactional(readOnly = true)
    public Page<StaffResponse> list(Pageable pageable) {
        return staffRepository.findAll(pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public StaffResponse get(UUID id) {
        return toResponse(find(id));
    }

    @Transactional
    public StaffResponse setActive(UUID id, boolean active) {
        Staff staff = find(id);
        staff.setActive(active);
        return toResponse(staffRepository.save(staff));
    }

    @Transactional
    public StaffSkillsResponse assignSkills(UUID staffId, AssignSkillsRequest request) {
        Staff staff = find(staffId);
        if (!staff.isActive()) {
            throw new BusinessException("Staff is not active");
        }
        String level = request.proficiencyLevel() == null || request.proficiencyLevel().isBlank()
                ? "INTERMEDIATE" : request.proficiencyLevel().trim().toUpperCase();
        if (!LEVELS.contains(level)) {
            throw new BusinessException("proficiencyLevel must be EXPERT, INTERMEDIATE or BEGINNER");
        }

        for (UUID serviceId : request.serviceIds()) {
            careServiceRepository.findByIdAndActiveTrue(serviceId)
                    .orElseThrow(() -> new ResourceNotFoundException("Service", serviceId));

            StaffSkill skill = skillRepository.findByStaffIdAndServiceId(staffId, serviceId)
                    .orElseGet(() -> {
                        StaffSkill created = new StaffSkill();
                        created.setStaffId(staffId);
                        created.setServiceId(serviceId);
                        return created;
                    });
            skill.setProficiencyLevel(level);
            skillRepository.save(skill);
        }
        return skillsOf(staffId);
    }

    @Transactional(readOnly = true)
    public StaffSkillsResponse listSkills(UUID staffId) {
        find(staffId);
        return skillsOf(staffId);
    }

    private StaffSkillsResponse skillsOf(UUID staffId) {
        List<SkillResponse> skills = skillRepository.findByStaffId(staffId).stream()
                .map(s -> new SkillResponse(s.getId(), s.getServiceId(),
                        s.getProficiencyLevel(), s.getCreatedAt()))
                .toList();
        return new StaffSkillsResponse(staffId, skills);
    }

    private Staff find(UUID id) {
        return staffRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Staff", id));
    }

    private StaffResponse toResponse(Staff s) {
        return new StaffResponse(s.getId(), s.getUserId(), s.getBranchId(),
                s.getPosition(), s.getBio(), s.isActive(), s.getCreatedAt(), s.getUpdatedAt());
    }

    @Transactional
    public SkillResponse updateSkill(UUID staffId, UUID skillId, UpdateSkillRequest request) {
        StaffSkill skill = skillRepository.findById(skillId)
                .orElseThrow(() -> new ResourceNotFoundException("StaffSkill", skillId));
        if (!skill.getStaffId().equals(staffId)) {
            throw new BusinessException("Skill does not belong to this staff");
        }
        String level = request.proficiencyLevel().trim().toUpperCase();
        if (!LEVELS.contains(level)) {
            throw new BusinessException("proficiencyLevel must be EXPERT, INTERMEDIATE or BEGINNER");
        }
        skill.setProficiencyLevel(level);
        skillRepository.save(skill);
        return new SkillResponse(skill.getId(), skill.getServiceId(),
                skill.getProficiencyLevel(), skill.getCreatedAt());
    }

    @Transactional
    public void removeSkill(UUID staffId, UUID skillId) {
        StaffSkill skill = skillRepository.findById(skillId)
                .orElseThrow(() -> new ResourceNotFoundException("StaffSkill", skillId));
        if (!skill.getStaffId().equals(staffId)) {
            throw new BusinessException("Skill does not belong to this staff");
        }
        skillRepository.delete(skill);
    }
}

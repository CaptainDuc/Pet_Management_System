package com.petcare.platform.staff.repository;

import com.petcare.platform.staff.domain.Staff;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StaffRepository extends JpaRepository<Staff, UUID> {

    List<Staff> findByIdInAndActiveTrue(Collection<UUID> ids);
    
    interface DirectoryEntry {
        UUID getId();
        String getFullName();
        boolean getActive();
        String getBranchName();
    }

    String DIRECTORY = "select s.id as id, u.fullName as fullName, "
            + "(s.active = true and u.status = 'ACTIVE') as active, b.name as branchName "
            + "from Staff s join User u on s.userId = u.id left join Branch b on b.id = s.branchId ";

    @org.springframework.data.jpa.repository.Query(DIRECTORY + "order by u.fullName, s.id")
    List<DirectoryEntry> directory();

    @org.springframework.data.jpa.repository.Query(DIRECTORY + "where s.id in :ids")
    List<DirectoryEntry> directoryById(Collection<UUID> ids);

    String IS_DOCTOR = "(u.role = 'VETERINARIAN' or exists (select 1 from User doctor join doctor.roles role "
            + "where doctor.id = u.id and role.name = 'VETERINARIAN'))";
    String SERVICE_SKILL_JOIN = " left join StaffSkill skill on skill.staffId = st.id and skill.serviceId = c.id ";
    String PROVIDES_SERVICE = IS_DOCTOR;

    interface StaffServiceEntry {
        UUID getStaffId();
        UUID getServiceId();
    }

    @org.springframework.data.jpa.repository.Query("select st.id as staffId, c.id as serviceId from Staff st "
            + "join User u on u.id = st.userId cross join CareService c " + SERVICE_SKILL_JOIN
            + "where st.id in :ids and c.active = true and " + PROVIDES_SERVICE)
    List<StaffServiceEntry> availableServices(Collection<UUID> ids);

    interface DoctorEntry {
        UUID getUserId();
        String getFullName();
        String getEmail();
        String getAccountStatus();
        UUID getStaffId();
        String getPosition();
        Boolean getStaffActive();
        String getBranchName();
        long getServiceCount();
    }

    @org.springframework.data.jpa.repository.Query("""
            select u.id as userId, u.fullName as fullName, u.email as email, u.status as accountStatus,
                   s.id as staffId, s.position as position, s.active as staffActive, b.name as branchName,
                   (select count(c.id) from CareService c where c.active = true and s.id is not null) as serviceCount
            from User u left join Staff s on s.userId = u.id left join Branch b on b.id = s.branchId
            where
            """ + IS_DOCTOR + " order by u.fullName, u.email")
    List<DoctorEntry> doctors();

    boolean existsByUserId(UUID userId);

    Optional<Staff> findByIdAndActiveTrue(UUID id);

    @org.springframework.data.jpa.repository.Query("select st from Staff st join User u on u.id = st.userId "
            + "join CareService c on c.id = :serviceId and c.active = true " + SERVICE_SKILL_JOIN
            + "where st.id = :id and st.active = true and u.status = 'ACTIVE' and " + PROVIDES_SERVICE)
    Optional<Staff> findBookable(UUID id, UUID serviceId);
}

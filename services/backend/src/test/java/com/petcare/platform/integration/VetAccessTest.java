package com.petcare.platform.integration;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class VetAccessTest extends IntegrationTestBase {

    private ResponseEntity<String> readRecords(String token, UUID petId) {
        return send(HttpMethod.GET, "/api/v1/medical/records/pet/" + petId, token, null);
    }

    private ResponseEntity<String> writeRecord(String token, UUID petId) {
        return send(HttpMethod.POST, "/api/v1/medical/records", token,
                Map.of("petId", petId.toString(), "visitDate", LocalDate.now().toString(),
                        "diagnosis", "Viem duong ruot cap", "treatment", "Khang sinh 7 ngay"));
    }

    private void insertRecord(UUID petId) {
        jdbc.update("insert into medical_records (pet_id, diagnosis, treatment, visit_date) "
                + "values (?, 'Viem da', 'Thuoc boi', current_date)", petId);
    }

    @Test
    void ownerSeesRecordsButStrangerAndReceptionistDoNot() {
        TestUser owner = newUser("CUSTOMER");
        TestUser stranger = newUser("CUSTOMER");
        TestUser receptionist = newUser("STAFF");
        TestUser admin = newUser("ADMIN");
        UUID petId = createPet(owner.token());
        insertRecord(petId);

        ResponseEntity<String> byOwner = readRecords(owner.token(), petId);
        assertThat(byOwner.getStatusCode()).as(byOwner.getBody()).isEqualTo(HttpStatus.OK);
        assertThat(byOwner.getBody()).contains("Viem da");

        // Người khác: 404 (trước khi sửa đây là 200, lộ hồ sơ bệnh án)
        assertThat(readRecords(stranger.token(), petId).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        // Lễ tân không có quyền xem nội dung y tế
        assertThat(readRecords(receptionist.token(), petId).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        // Admin xem được
        assertThat(readRecords(admin.token(), petId).getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void customerCannotWriteMedicalRecords() {
        TestUser owner = newUser("CUSTOMER");
        UUID petId = createPet(owner.token());

        assertThat(writeRecord(owner.token(), petId).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void vetAccessFollowsTheBookingLifecycle() {
        Scenario s = newScenario("VETERINARIAN");
        TestUser vet = s.staffUser();
        UUID slot = s.slotIds().get(0);
        insertRecord(s.petId());

        UUID bookingId = idOf(send(HttpMethod.POST, "/api/v1/bookings", s.customer().token(),
                bookingBody(s.petId(), s.serviceId(), slot)));

        // 1. Lịch mới đặt (PENDING): bác sĩ chưa được xem
        assertThat(readRecords(vet.token(), s.petId()).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);

        // 2. Lịch đã xác nhận: được xem, nhưng chưa được ghi
        ResponseEntity<String> confirm = send(HttpMethod.POST, "/api/v1/bookings/" + bookingId + "/confirm",
                s.admin().token(), null);
        assertThat(confirm.getStatusCode()).as(confirm.getBody()).isEqualTo(HttpStatus.OK);
        assertThat(readRecords(vet.token(), s.petId()).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(writeRecord(vet.token(), s.petId()).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);

        // 3. Lịch đang thực hiện: được ghi, tên bác sĩ tự điền theo tài khoản
        jdbc.update("update time_slots set start_time = now() - interval '10 minutes', "
                + "end_time = now() + interval '20 minutes' where id = ?", slot);
        ResponseEntity<String> start = send(HttpMethod.POST, "/api/v1/bookings/" + bookingId + "/start",
                s.admin().token(), null);
        assertThat(start.getStatusCode()).as(start.getBody()).isEqualTo(HttpStatus.OK);

        ResponseEntity<String> written = writeRecord(vet.token(), s.petId());
        assertThat(written.getStatusCode()).as(written.getBody()).isEqualTo(HttpStatus.CREATED);
        assertThat(json(written).path("vetName").asText()).isEqualTo(vet.fullName());

        // 4. Thú cưng khác không thuộc lịch hẹn của bác sĩ: không xem, không ghi
        TestUser otherOwner = newUser("CUSTOMER");
        UUID otherPet = createPet(otherOwner.token());
        assertThat(readRecords(vet.token(), otherPet).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(writeRecord(vet.token(), otherPet).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }
}
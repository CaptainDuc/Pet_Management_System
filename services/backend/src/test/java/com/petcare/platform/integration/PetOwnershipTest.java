package com.petcare.platform.integration;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class PetOwnershipTest extends IntegrationTestBase {

    @Test
    void ownerCanReadOwnPet() {
        TestUser owner = newUser("CUSTOMER");
        UUID petId = createPet(owner.token());

        ResponseEntity<String> response = send(HttpMethod.GET, "/api/v1/pets/" + petId, owner.token(), null);

        assertThat(response.getStatusCode()).as(response.getBody()).isEqualTo(HttpStatus.OK);
        assertThat(json(response).path("data").path("name").asText()).isEqualTo("Mimi");
    }

    @Test
    void otherCustomerGetsNotFound() {
        TestUser owner = newUser("CUSTOMER");
        TestUser stranger = newUser("CUSTOMER");
        UUID petId = createPet(owner.token());

        ResponseEntity<String> response = send(HttpMethod.GET, "/api/v1/pets/" + petId, stranger.token(), null);

        assertThat(response.getStatusCode()).as(response.getBody()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void otherCustomerCannotDeleteOrSeeInList() {
        TestUser owner = newUser("CUSTOMER");
        TestUser stranger = newUser("CUSTOMER");
        UUID petId = createPet(owner.token());

        ResponseEntity<String> delete = send(HttpMethod.DELETE, "/api/v1/pets/" + petId, stranger.token(), null);
        assertThat(delete.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);

        ResponseEntity<String> list = send(HttpMethod.GET, "/api/v1/pets", stranger.token(), null);
        assertThat(list.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(list.getBody()).doesNotContain(petId.toString());

        // Thú cưng vẫn còn nguyên với chủ
        ResponseEntity<String> stillThere = send(HttpMethod.GET, "/api/v1/pets/" + petId, owner.token(), null);
        assertThat(stillThere.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void clinicStaffCanReadAnyPet() {
        TestUser owner = newUser("CUSTOMER");
        TestUser staff = newUser("STAFF");
        UUID petId = createPet(owner.token());

        ResponseEntity<String> response = send(HttpMethod.GET, "/api/v1/pets/" + petId, staff.token(), null);

        assertThat(response.getStatusCode()).as(response.getBody()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void anonymousRequestIsRejected() {
        ResponseEntity<String> response = send(HttpMethod.GET, "/api/v1/pets", null, null);

        assertThat(response.getStatusCode().value()).isIn(401, 403);
    }
}
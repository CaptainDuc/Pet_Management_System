package com.petcare.platform.integration;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.UUID;
import java.util.Map;
import java.util.Base64;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import javax.imageio.ImageIO;

import static org.assertj.core.api.Assertions.assertThat;

class PetOwnershipTest extends IntegrationTestBase {

    @Test
    void photoThumbnailPersistsWithOwnerAccessAndSizeValidation() throws Exception {
        TestUser owner = newUser("CUSTOMER");
        TestUser stranger = newUser("CUSTOMER");
        UUID petId = createPet(owner.token());
        ByteArrayOutputStream image = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(32, 32, BufferedImage.TYPE_INT_RGB), "jpg", image);
        String photo = "data:image/jpeg;base64," + Base64.getEncoder().encodeToString(image.toByteArray());
        assertThat(photo.length()).isGreaterThan(500);
        Map<String, Object> body = Map.of("name", "Mimi", "species", "Cat", "photoUrl", photo);
        ResponseEntity<String> updated = send(HttpMethod.PUT, "/api/v1/pets/" + petId, owner.token(), body);
        assertThat(updated.getStatusCode()).as(updated.getBody()).isEqualTo(HttpStatus.OK);
        ResponseEntity<String> loaded = send(HttpMethod.GET, "/api/v1/pets/" + petId, owner.token(), null);
        assertThat(json(loaded).path("data").path("photoUrl").asText()).isEqualTo(photo);
        assertThat(send(HttpMethod.PUT, "/api/v1/pets/" + petId, stranger.token(), body).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
        for (String invalid : new String[] {"data:image/svg+xml;base64,PHN2Zz4=", "data:image/jpeg;base64,/9j/" + "A".repeat(350000)}) {
            ResponseEntity<String> rejected = send(HttpMethod.PUT, "/api/v1/pets/" + petId, owner.token(),
                    Map.of("name", "Mimi", "species", "Cat", "photoUrl", invalid));
            assertThat(rejected.getStatusCode()).as(rejected.getBody()).isEqualTo(HttpStatus.BAD_REQUEST);
        }
        assertThat(json(send(HttpMethod.GET, "/api/v1/pets/" + petId, owner.token(), null))
                .path("data").path("photoUrl").asText()).isEqualTo(photo);
    }

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
    void ownerCanDeletePetAndItIsRemovedFromTheirActiveProfiles() {
        TestUser owner = newUser("CUSTOMER");
        UUID petId = createPet(owner.token());

        ResponseEntity<String> deleted = send(HttpMethod.DELETE, "/api/v1/pets/" + petId, owner.token(), null);

        assertThat(deleted.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(send(HttpMethod.GET, "/api/v1/pets/" + petId, owner.token(), null).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
        ResponseEntity<String> list = send(HttpMethod.GET, "/api/v1/pets", owner.token(), null);
        assertThat(list.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(list.getBody()).doesNotContain(petId.toString());
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

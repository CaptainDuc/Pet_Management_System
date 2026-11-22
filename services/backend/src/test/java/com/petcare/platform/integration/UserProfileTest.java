package com.petcare.platform.integration;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.Base64;
import java.util.Map;
import javax.imageio.ImageIO;

import static org.assertj.core.api.Assertions.assertThat;

class UserProfileTest extends IntegrationTestBase {
    private static final String NEW_PASSWORD="NewProfilePass!123";
    private Map<String,String> password(String current,String next,String confirmation) {
        return Map.of("currentPassword",current,"newPassword",next,"confirmPassword",confirmation);
    }

    @Test void profilePersistsUploadedAvatarAndCannotChangeEmailOrPrivileges() throws Exception {
        TestUser user=newUser("CUSTOMER");
        var bytes=new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(16,16,BufferedImage.TYPE_INT_RGB),"jpeg",bytes);
        String photo="data:image/jpeg;base64,"+Base64.getEncoder().encodeToString(bytes.toByteArray());
        assertThat(photo.length()).isGreaterThan(500);
        var response=send(HttpMethod.PUT,"/api/v1/users/me",user.token(),Map.of(
                "fullName","  An Nguyễn  ","phone","+84 912-345-678","avatarUrl",photo,
                "email","changed@petcare.invalid","role","ADMIN","status","LOCKED"));
        assertThat(response.getStatusCode()).as(response.getBody()).isEqualTo(HttpStatus.OK);
        var data=json(send(HttpMethod.GET,"/api/v1/users/me",user.token(),null)).path("data");
        assertThat(data.path("fullName").asText()).isEqualTo("An Nguyễn");
        assertThat(data.path("phone").asText()).isEqualTo("+84912345678");
        assertThat(data.path("avatarUrl").asText()).isEqualTo(photo);
        assertThat(data.path("email").asText()).isEqualTo(user.email());
        assertThat(data.path("role").asText()).isEqualTo("CUSTOMER");
        assertThat(data.path("status").asText()).isEqualTo("ACTIVE");
    }

    @Test void phoneAndAvatarCanBeCleared() {
        TestUser user=newUser("CUSTOMER");
        assertThat(send(HttpMethod.PUT,"/api/v1/users/me",user.token(),Map.of("avatarUrl","https://example.com/profile.jpg")).getStatusCode()).isEqualTo(HttpStatus.OK);
        var response=send(HttpMethod.PUT,"/api/v1/users/me",user.token(),Map.of("phone","","avatarUrl",""));
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(json(response).path("data").hasNonNull("phone")).isFalse();
        assertThat(json(response).path("data").hasNonNull("avatarUrl")).isFalse();
        assertThat(json(response).path("data").path("fullName").asText()).isEqualTo(user.fullName());
    }

    @Test void invalidProfileInputsCannotPartiallyModifyUser() {
        TestUser user=newUser("CUSTOMER");
        assertThat(send(HttpMethod.PUT,"/api/v1/users/me",user.token(),Map.of("fullName","   ")).getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(send(HttpMethod.PUT,"/api/v1/users/me",user.token(),Map.of("fullName","Should not save","phone","invalid")).getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        for (String photo:java.util.List.of("javascript:alert(1)","data:image/svg+xml;base64,PHN2Zz4=","a".repeat(350001))) {
            assertThat(send(HttpMethod.PUT,"/api/v1/users/me",user.token(),Map.of("avatarUrl",photo)).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        }
        assertThat(json(send(HttpMethod.GET,"/api/v1/users/me",user.token(),null)).path("data").path("fullName").asText()).isEqualTo(user.fullName());
    }

    @Test void duplicatePhoneIsRejectedWithoutChangingProfile() {
        TestUser a=newUser("CUSTOMER"),b=newUser("CUSTOMER");
        String phone=jdbc.queryForObject("SELECT phone FROM users WHERE id=?",String.class,b.id());
        assertThat(send(HttpMethod.PUT,"/api/v1/users/me",a.token(),Map.of("fullName","Should not save","phone",phone)).getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(jdbc.queryForObject("SELECT full_name FROM users WHERE id=?",String.class,a.id())).isEqualTo(a.fullName());
    }

    @Test void everyRoleCanUpdateItsOwnProfile() {
        for (String role:java.util.List.of("CUSTOMER","ADMIN","OWNER","STAFF","VETERINARIAN")) {
            TestUser user=newUser(role);
            var response=send(HttpMethod.PUT,"/api/v1/users/me",user.token(),Map.of("fullName","Updated "+role));
            assertThat(response.getStatusCode()).as(role+": "+response.getBody()).isEqualTo(HttpStatus.OK);
            assertThat(json(response).path("data").path("role").asText()).isEqualTo(role);
        }
    }

    @Test void profileAndPasswordActionsRequireAuthentication() {
        assertThat(send(HttpMethod.PUT,"/api/v1/users/me",null,Map.of("fullName","Unknown user")).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(send(HttpMethod.POST,"/api/v1/users/me/password",null,password(PASSWORD,NEW_PASSWORD,NEW_PASSWORD)).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test void wrongCurrentPasswordAndMismatchedConfirmationLeaveSessionsUsable() {
        TestUser user=newUser("CUSTOMER");
        assertThat(send(HttpMethod.POST,"/api/v1/users/me/password",user.token(),password("Incorrect123!",NEW_PASSWORD,NEW_PASSWORD)).getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(send(HttpMethod.POST,"/api/v1/users/me/password",user.token(),password(PASSWORD,NEW_PASSWORD,"Different123!")).getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(send(HttpMethod.POST,"/api/v1/users/me/password",user.token(),password(PASSWORD,"short","short")).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(send(HttpMethod.GET,"/api/v1/users/me",user.token(),null).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(jdbc.queryForObject("SELECT credential_version FROM users WHERE id=?",Integer.class,user.id())).isZero();
    }

    @Test void passwordChangeRotatesCurrentSessionAndRevokesOldSessions() {
        TestUser user=newUser("STAFF");
        var oldLogin=send(HttpMethod.POST,"/api/v1/auth/login",null,Map.of("email",user.email(),"password",PASSWORD));
        String oldRefresh=json(oldLogin).path("data").path("refreshToken").asText();
        send(HttpMethod.PUT,"/api/v1/users/me",user.token(),Map.of("fullName","Updated before password"));
        var response=send(HttpMethod.POST,"/api/v1/users/me/password",user.token(),password(PASSWORD,NEW_PASSWORD,NEW_PASSWORD));
        assertThat(response.getStatusCode()).as(response.getBody()).isEqualTo(HttpStatus.OK);
        String nextToken=json(response).path("data").path("accessToken").asText();
        assertThat(nextToken).isNotBlank();
        assertThat(json(response).path("data").path("user").path("fullName").asText()).isEqualTo("Updated before password");
        assertThat(send(HttpMethod.GET,"/api/v1/users/me",nextToken,null).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(send(HttpMethod.GET,"/api/v1/users/me",user.token(),null).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(send(HttpMethod.POST,"/api/v1/auth/refresh",null,Map.of("refreshToken",oldRefresh)).getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(send(HttpMethod.POST,"/api/v1/auth/login",null,Map.of("email",user.email(),"password",PASSWORD)).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(send(HttpMethod.POST,"/api/v1/auth/login",null,Map.of("email",user.email(),"password",NEW_PASSWORD)).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(send(HttpMethod.POST,"/api/v1/auth/refresh",null,Map.of("refreshToken",json(response).path("data").path("refreshToken").asText())).getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test void passwordChangeCannotTargetAnotherAccount() {
        TestUser a=newUser("CUSTOMER"),b=newUser("CUSTOMER");
        String original=jdbc.queryForObject("SELECT password FROM users WHERE id=?",String.class,b.id());
        var payload=new java.util.HashMap<String,Object>(password(PASSWORD,NEW_PASSWORD,NEW_PASSWORD));
        payload.put("userId",b.id());payload.put("email",b.email());
        assertThat(send(HttpMethod.POST,"/api/v1/users/me/password",a.token(),payload).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(jdbc.queryForObject("SELECT password FROM users WHERE id=?",String.class,b.id())).isEqualTo(original);
    }
}

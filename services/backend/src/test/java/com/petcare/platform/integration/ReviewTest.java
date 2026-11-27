package com.petcare.platform.integration;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import java.util.Map;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;

class ReviewTest extends IntegrationTestBase {
    @Test
    void completedVisitAcceptsOneOwnerReviewAndOnlyOptedInFeedbackIsPublic() {
        var customer = newUser("CUSTOMER");
        var other = newUser("CUSTOMER");
        var pet = createPet(customer.token());
        for (boolean publish : new boolean[]{false, true}) {
            var id = UUID.randomUUID();
            String path = "/api/v1/reviews/" + id;
            var body = Map.of("rating", 4, "comment", id.toString(), "published", publish);
            jdbc.update("insert into bookings(id,customer_id,pet_id) values(?,?,?)", id, customer.id(), pet);
            assertThat(send(HttpMethod.POST,path,customer.token(),body).getStatusCode().value()).isEqualTo(422);
            jdbc.update("update bookings set status='COMPLETED' where id=?", id);
            assertThat(send(HttpMethod.POST,path,other.token(),body).getStatusCode().value()).isEqualTo(422);
            assertThat(send(HttpMethod.POST,path,customer.token(),body).getStatusCode().value()).isEqualTo(200);
            assertThat(send(HttpMethod.POST,path,customer.token(),body).getStatusCode().value()).isEqualTo(409);
            assertThat(json(send(HttpMethod.GET,path,customer.token(),null)).at("/data/comment").asText()).isEqualTo(id.toString());
            var feed = json(send(HttpMethod.GET,"/api/v1/reviews/public",null,null)).at("/data/recent");
            assertThat(feed.findValuesAsText("comment").contains(id.toString())).isEqualTo(publish);
        }
    }
}

package com.petcare.platform.booking.controller;

import com.petcare.platform.common.dto.ApiResponse;
import com.petcare.platform.common.exception.BusinessException;
import com.petcare.platform.common.exception.ConflictException;
import com.petcare.platform.common.security.UserPrincipal;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/reviews")
public class ReviewController {
    private final JdbcClient db;
    public record Review(@Min(1) @Max(5) int rating, @NotNull @Size(max=1000) String comment, boolean published) {}
    public record PublicReview(int rating, String comment) {}
    public record Summary(long count, Double average) {}
    public record Feed(Summary summary, List<PublicReview> recent) {}

    @GetMapping("/public")
    public ApiResponse<Feed> feed() {
        var summary = db.sql("select count(*) as count, round(avg(rating),1) as average from reviews where is_published")
                .query(Summary.class).single();
        var recent = db.sql("select rating, comment from reviews where is_published order by created_at desc, id limit 3")
                .query(PublicReview.class).list();
        return ApiResponse.ok(new Feed(summary, recent));
    }

    @GetMapping("/{booking}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ApiResponse<Review> mine(@PathVariable UUID booking, @AuthenticationPrincipal UserPrincipal user) {
        return ApiResponse.ok(db.sql("select rating, comment, is_published as published from reviews where booking_id=? and customer_id=?")
                .params(booking, user.getId()).query(Review.class).optional().orElse(null));
    }

    @PostMapping("/{booking}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ApiResponse<Review> submit(@PathVariable UUID booking, @AuthenticationPrincipal UserPrincipal user,
                                      @RequestBody @Valid Review input) {
        var review = new Review(input.rating(),input.comment().strip(),input.published());
        int saved = db.sql("""
                insert into reviews(booking_id,customer_id,rating,comment,is_published)
                select id, customer_id, ?, ?, ? from bookings where id=? and customer_id=? and status='COMPLETED'
                on conflict (booking_id) do nothing
                """).params(review.rating(),review.comment(),review.published(),booking,user.getId()).update();
        if (saved == 0) {
            if (mine(booking,user).data() != null) throw new ConflictException("Bạn đã đánh giá buổi hẹn này.");
            throw new BusinessException("Chỉ có thể đánh giá buổi hẹn của bạn sau khi hoàn tất.");
        }
        return ApiResponse.ok(review);
    }
}

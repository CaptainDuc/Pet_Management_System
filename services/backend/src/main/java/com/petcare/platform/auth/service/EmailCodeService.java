package com.petcare.platform.auth.service;

import com.petcare.platform.auth.dto.EmailChallengeResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EmailCodeService {
    private final JdbcTemplate jdbc;
    private final PasswordEncoder encoder;
    private final AuthEmailSender sender;
    private final SecureRandom random = new SecureRandom();

    @Value("${app.email-code.ttl-seconds:600}") private int ttl;
    @Value("${app.email-code.resend-seconds:60}") private int cooldown;

    public record Draft(String fullName, String passwordHash, String phone) {}
    private record Challenge(UUID id, String hash, Instant expiresAt, Instant sentAt, Instant windowStart,
                             int sends, int attempts, boolean consumed, Draft draft) {}

    public static String normalize(String email) { return email.strip().toLowerCase(Locale.ROOT); }

    private void lock(String email, String purpose) {
        // PostgreSQL transaction lock also serializes requests before the first row exists.
        jdbc.query("SELECT pg_advisory_xact_lock(hashtextextended(?, 0))", rs -> null, email + ":" + purpose);
    }

    private Challenge find(String email, String purpose) {
        return jdbc.query("SELECT * FROM auth_email_codes WHERE email=? AND purpose=? FOR UPDATE", (rs, n) ->
                new Challenge(rs.getObject("challenge_id", UUID.class), rs.getString("code_hash"), rs.getTimestamp("expires_at").toInstant(),
                        rs.getTimestamp("sent_at").toInstant(), rs.getTimestamp("window_started_at").toInstant(),
                        rs.getInt("send_count"), rs.getInt("attempts"), rs.getBoolean("consumed"),
                        new Draft(rs.getString("full_name"), rs.getString("password_hash"), rs.getString("phone"))),
                email, purpose).stream().findFirst().orElse(null);
    }

    @Transactional
    public EmailChallengeResponse issue(String address, String purpose, Draft draft) {
        String email = normalize(address);
        lock(email, purpose);
        Instant now = Instant.now();
        Challenge old = find(email, purpose);
        if (old != null && old.sentAt().plusSeconds(cooldown).isAfter(now)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Vui lòng chờ " + cooldown + " giây giữa các lần gửi mã.");
        }
        boolean sameWindow = old != null && old.windowStart().plus(1, ChronoUnit.HOURS).isAfter(now);
        if (sameWindow && old.sends() >= 5) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Bạn đã yêu cầu quá nhiều mã. Vui lòng thử lại sau một giờ.");
        }
        String code = String.format(Locale.ROOT, "%06d", random.nextInt(1_000_000));
        UUID challengeId = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO auth_email_codes(email,purpose,challenge_id,code_hash,expires_at,sent_at,window_started_at,send_count,full_name,password_hash,phone)
                VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(email,purpose) DO UPDATE SET challenge_id=EXCLUDED.challenge_id,
                code_hash=EXCLUDED.code_hash,expires_at=EXCLUDED.expires_at,sent_at=EXCLUDED.sent_at,
                window_started_at=EXCLUDED.window_started_at,send_count=EXCLUDED.send_count,
                attempts=0,consumed=false,full_name=EXCLUDED.full_name,password_hash=EXCLUDED.password_hash,phone=EXCLUDED.phone
                """, email, purpose, challengeId, encoder.encode(code), Timestamp.from(now.plusSeconds(ttl)), Timestamp.from(now),
                Timestamp.from(sameWindow ? old.windowStart() : now), sameWindow ? old.sends()+1 : 1,
                draft == null ? null : draft.fullName(), draft == null ? null : draft.passwordHash(), draft == null ? null : draft.phone());
        if (draft != null) sender.send(email, purpose, code, ttl);
        // Pending drafts contain only hashes; discard abandoned registration data after a day.
        jdbc.update("DELETE FROM auth_email_codes WHERE sent_at < ?", Timestamp.from(now.minus(1, ChronoUnit.DAYS)));
        return new EmailChallengeResponse(challengeId, email, ttl, cooldown, "RESET".equals(purpose)
                ? "Nếu email thuộc tài khoản đang hoạt động, mã xác nhận đã được gửi. Vui lòng kiểm tra cả thư rác."
                : "Mã xác nhận đã được gửi. Vui lòng kiểm tra hộp thư và thư rác.");
    }

    @Transactional
    public EmailChallengeResponse resendRegistration(String address) {
        String email = normalize(address);
        lock(email, "REGISTER");
        Challenge row = find(email, "REGISTER");
        if (row == null || row.consumed() || row.draft().passwordHash() == null) {
            throw new InvalidEmailCodeException();
        }
        return issue(email, "REGISTER", row.draft());
    }

    @Transactional(noRollbackFor = InvalidEmailCodeException.class)
    public Draft consume(String address, String purpose, UUID challengeId, String code) {
        String email = normalize(address);
        lock(email, purpose);
        Challenge row = find(email, purpose);
        if (row == null || !row.id().equals(challengeId) || row.consumed() || row.attempts() >= 5 || !row.expiresAt().isAfter(Instant.now())) {
            throw new InvalidEmailCodeException();
        }
        if (!encoder.matches(code, row.hash())) {
            jdbc.update("UPDATE auth_email_codes SET attempts=attempts+1 WHERE email=? AND purpose=?", email, purpose);
            throw new InvalidEmailCodeException();
        }
        jdbc.update("UPDATE auth_email_codes SET consumed=true WHERE email=? AND purpose=?", email, purpose);
        return row.draft();
    }
}

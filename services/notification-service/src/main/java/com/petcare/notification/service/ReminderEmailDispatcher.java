package com.petcare.notification.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class ReminderEmailDispatcher {
    private final JdbcTemplate jdbc;
    private final JavaMailSender mailSender;
    @Value("${app.mail.from:no-reply@petcare.local}") private String from;

    private record Delivery(UUID id, String recipient, String title, String body, int attempts) {}

    @Scheduled(fixedDelayString = "${app.mail.reminder-scan-ms:5000}")
    @Transactional
    public void sendNext() {
        var due = jdbc.query("""
                select d.id, d.recipient, n.title, n.body, d.attempt_count
                from notification_deliveries d join notifications n on n.id=d.notification_id
                where d.channel='EMAIL' and d.status in ('PENDING','FAILED') and d.next_attempt_at<=now()
                order by d.next_attempt_at,d.created_at limit 1 for update of d skip locked
                """, (rs, row) -> new Delivery(rs.getObject("id", UUID.class), rs.getString("recipient"),
                rs.getString("title"), rs.getString("body"), rs.getInt("attempt_count")));
        if (due.isEmpty()) return;
        var delivery = due.getFirst();
        var message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(delivery.recipient());
        message.setSubject("Pet Service - " + delivery.title());
        message.setText("Xin chào,\n\n" + delivery.body() + "\n\nPet Service");
        try {
            mailSender.send(message);
            jdbc.update("""
                    update notification_deliveries set status='SENT',attempt_count=attempt_count+1,
                    sent_at=now(),updated_at=now(),last_error=null where id=?
                    """, delivery.id());
        } catch (MailException ex) {
            int attempts = delivery.attempts() + 1;
            jdbc.update("""
                    update notification_deliveries set status=?,attempt_count=?,
                    next_attempt_at=now() + (? * interval '5 minutes'),updated_at=now(),last_error=? where id=?
                    """, attempts >= 8 ? "DEAD_LETTERED" : "FAILED", attempts, attempts,
                    ex.getClass().getSimpleName(), delivery.id());
            log.warn("Reminder email delivery {} failed on attempt {}", delivery.id(), attempts);
        }
    }
}

package com.petcare.notification.event;

import com.petcare.notification.config.RabbitConfig;
import com.petcare.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@RequiredArgsConstructor
public class BookingEventListener {

    private final NotificationService notificationService;

    @RabbitListener(queues = RabbitConfig.BOOKING_QUEUE)
    public void onBookingEvent(Map<String, Object> envelope) {
        notificationService.handleBookingEvent(envelope);
    }
}
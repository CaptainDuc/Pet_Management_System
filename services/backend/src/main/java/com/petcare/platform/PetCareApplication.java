package com.petcare.platform;

import java.util.TimeZone;

import jakarta.annotation.PostConstruct;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableCaching
@EnableScheduling
@EnableJpaAuditing
public class PetCareApplication {

    @PostConstruct
    public void init() {
        TimeZone.setDefault(
            TimeZone.getTimeZone("Asia/Ho_Chi_Minh")
        );
    }
    public static void main(String[] args) {
        SpringApplication.run(PetCareApplication.class, args);
    }
}

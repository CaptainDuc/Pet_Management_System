package com.petcare.gateway;

import org.springframework.cloud.gateway.config.HttpClientCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Configuration
public class ServiceDnsConfig {
    @Bean
    HttpClientCustomizer serviceDnsCache() {
        // Docker changes a service IP on recreation; its DNS TTL is otherwise
        // cached long enough to keep routing to a removed container.
        return client -> client.resolver(resolver -> resolver.cacheMaxTimeToLive(Duration.ofSeconds(10)));
    }
}

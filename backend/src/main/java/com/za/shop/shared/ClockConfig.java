package com.za.shop.shared;

import java.time.Clock;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
class ClockConfig {

    /** Injected everywhere instead of calling {@code Instant.now()}, so time can be controlled in tests. */
    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }
}

package com.applyrec.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.time.Clock;

/** A single injectable clock so time-dependent logic can be tested deterministically. */
@Configuration
@EnableScheduling
public class TimeConfig {

    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }
}

package com.applyrec;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;

// Auth is JWT-only; exclude the default in-memory user (and its generated password log line).
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class ApplyRecApplication {

    public static void main(String[] args) {
        SpringApplication.run(ApplyRecApplication.class, args);
    }
}

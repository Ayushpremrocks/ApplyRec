package com.applyrec.config;

import com.applyrec.entity.Application;
import com.applyrec.entity.User;
import com.applyrec.repository.ApplicationRepository;
import com.applyrec.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.util.List;

/**
 * Seeds a demo account for local development. Requires BOTH the "dev" profile AND
 * app.dev-seed.enabled=true, so it can never run in production by accident.
 */
@Configuration
@Profile("dev")
@ConditionalOnProperty(name = "app.dev-seed.enabled", havingValue = "true")
public class DevDataInitializer {

    private static final Logger log = LoggerFactory.getLogger(DevDataInitializer.class);

    @Bean
    public CommandLineRunner seedDevData(
            UserRepository userRepository,
            ApplicationRepository applicationRepository,
            PasswordEncoder passwordEncoder
    ) {
        return args -> {
            if (userRepository.count() > 0) {
                return;
            }

            User user = new User();
            user.setEmail("test@applyrec.com");
            user.setPassword(passwordEncoder.encode("test123"));
            user = userRepository.save(user);

            applicationRepository.saveAll(List.of(
                    buildApp(user, "Acme Corp", "Software Engineer", "Applied", LocalDate.parse("2025-02-01")),
                    buildApp(user, "TechStart Inc", "Full Stack Developer", "OA", LocalDate.parse("2025-02-05")),
                    buildApp(user, "BigCo", "Backend Engineer", "Interview", LocalDate.parse("2025-01-20")),
                    buildApp(user, "StartupXYZ", "Frontend Developer", "Rejected", LocalDate.parse("2025-01-10")),
                    buildApp(user, "DreamJob Ltd", "Senior Engineer", "Offer", LocalDate.parse("2024-12-15"))
            ));
            log.warn("Seeded dev account test@applyrec.com — do not enable app.dev-seed.enabled in production");
        };
    }

    private Application buildApp(User user, String company, String role, String status, LocalDate appliedDate) {
        Application app = new Application();
        app.setUser(user);
        app.setCompany(company);
        app.setRole(role);
        app.setStatus(status);
        app.setAppliedDate(appliedDate);
        return app;
    }
}

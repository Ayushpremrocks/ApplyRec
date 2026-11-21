package com.applyrec.config;

import com.applyrec.mail.EmailSender;
import com.applyrec.mail.LoggingEmailSender;
import com.applyrec.mail.ResendEmailSender;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration
public class MailConfig {

    @Bean
    @ConditionalOnMissingBean(EmailSender.class)
    public EmailSender emailSender(
            @Value("${app.mail.resend-api-key:}") String apiKey,
            @Value("${app.mail.from}") String from,
            @Value("${app.mail.resend-base-url:https://api.resend.com}") String baseUrl,
            Environment environment
    ) {
        if (apiKey == null || apiKey.isBlank()) {
            return new LoggingEmailSender(environment.acceptsProfiles(Profiles.of("dev")));
        }
        return new ResendEmailSender(apiKey.trim(), from, baseUrl);
    }

    /** Sends emails off the request thread, so forgot-password takes the same time either way. */
    @Bean(name = "mailExecutor", destroyMethod = "shutdown")
    @ConditionalOnMissingBean(name = "mailExecutor")
    public ThreadPoolTaskExecutor mailExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(1);
        executor.setMaxPoolSize(2);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("mail-");
        executor.initialize();
        return executor;
    }
}

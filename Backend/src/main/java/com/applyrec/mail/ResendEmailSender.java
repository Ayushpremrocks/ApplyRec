package com.applyrec.mail;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;
import java.util.Map;

/** Sends mail through the Resend HTTP API (https://resend.com). */
public class ResendEmailSender implements EmailSender {

    private static final Logger log = LoggerFactory.getLogger(ResendEmailSender.class);

    private final RestClient client;
    private final String from;

    public ResendEmailSender(String apiKey, String from, String baseUrl) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5_000);
        factory.setReadTimeout(10_000);
        this.client = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(factory)
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .build();
        this.from = from;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }

    @Override
    public boolean send(String to, String subject, String text) {
        try {
            client.post()
                    .uri("/emails")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("from", from, "to", List.of(to), "subject", subject, "text", text))
                    .retrieve()
                    .toBodilessEntity();
            log.info("Sent email '{}'", subject);
            return true;
        } catch (RestClientException ex) {
            log.error("Failed to send email '{}': {}", subject, ex.getMessage());
            return false;
        }
    }
}

package com.applyrec;

import com.applyrec.mail.EmailSender;
import com.applyrec.service.InterviewReminderService;
import com.applyrec.support.EmbeddedPg;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Full HTTP → service → PostgreSQL flows on a local embedded database. */
@SpringBootTest(properties = {
        "app.jwt.secret=integration-test-secret-at-least-32-bytes!!",
        "app.frontend-url=https://app.example.com/",
        "app.reminders.initial-delay-ms=3600000",
        "app.rate-limit.signup-per-ip=1000",
        "app.rate-limit.login-per-ip=1000",
        "app.rate-limit.password-reset-per-ip=1000"
})
@AutoConfigureMockMvc
class ApiFlowIT {

    record Mail(String to, String subject, String text) {
    }

    static final List<Mail> OUTBOX = new CopyOnWriteArrayList<>();

    @TestConfiguration
    static class CapturingMail {
        @Bean
        @Primary
        EmailSender capturingEmailSender() {
            return new EmailSender() {
                @Override
                public boolean isEnabled() {
                    return true;
                }

                @Override
                public boolean send(String to, String subject, String text) {
                    OUTBOX.add(new Mail(to, subject, text));
                    return true;
                }
            };
        }
    }

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        String url = EmbeddedPg.newDatabase("api_flow_it");
        registry.add("spring.datasource.url", () -> url);
        registry.add("spring.datasource.username", () -> "postgres");
        registry.add("spring.datasource.password", () -> "postgres");
    }

    @Autowired
    MockMvc mvc;
    @Autowired
    ObjectMapper json;
    @Autowired
    InterviewReminderService reminderService;

    @BeforeEach
    void clearOutbox() {
        OUTBOX.clear();
    }

    // ------------------------------------------------------------------ helpers

    private JsonNode call(MockHttpServletRequestBuilder req, String token, Object body, int expectedStatus)
            throws Exception {
        if (token != null) req.header("Authorization", "Bearer " + token);
        if (body != null) req.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body));
        ResultActions result = mvc.perform(req).andExpect(status().is(expectedStatus));
        String content = result.andReturn().getResponse().getContentAsString();
        return content.isEmpty() ? null : json.readTree(content);
    }

    private String signup(String email) throws Exception {
        return call(post("/api/auth/signup"), null,
                java.util.Map.of("email", email, "password", "secret123"), 201).get("token").asText();
    }

    private static java.util.Map<String, Object> application(String company, String status) {
        var body = new java.util.HashMap<String, Object>();
        body.put("company", company);
        body.put("role", "Backend Engineer");
        body.put("status", status);
        body.put("appliedDate", "2025-05-01");
        body.put("salary", 18.5);
        body.put("jobUrl", "https://careers.example.com/jobs/123");
        body.put("openingType", "OFF_CAMPUS");
        body.put("referral", true);
        body.put("tags", List.of("Remote", " dream  company "));
        return body;
    }

    // -------------------------------------------------------------------- tests

    @Test
    void applicationLifecycleWithHistoryInterviewsArchiveAndAnalytics() throws Exception {
        String token = signup("flow@example.com");

        JsonNode created = call(post("/api/applications"), token, application("Acme", "Applied"), 201).get("application");
        long id = created.get("id").asLong();
        assertThat(created.get("job_url").asText()).isEqualTo("https://careers.example.com/jobs/123");
        assertThat(created.get("opening_type").asText()).isEqualTo("OFF_CAMPUS");
        assertThat(created.get("referral").asBoolean()).isTrue();
        assertThat(created.get("archived").asBoolean()).isFalse();
        assertThat(created.get("tags").toString()).isEqualTo("[\"dream company\",\"remote\"]");
        assertThat(created.get("interviews").size()).isZero();

        // Status changes are recorded in the timeline.
        call(patch("/api/applications/" + id + "/status"), token, java.util.Map.of("status", "OA"), 200);
        call(patch("/api/applications/" + id + "/status"), token, java.util.Map.of("status", "Interview"), 200);
        call(patch("/api/applications/" + id + "/status"), token, java.util.Map.of("status", "Interview"), 200);
        JsonNode history = call(get("/api/applications/" + id + "/history"), token, null, 200).get("history");
        assertThat(history).extracting(h -> h.get("from_status").asText("null") + ">" + h.get("to_status").asText())
                .containsExactly("null>Applied", "Applied>OA", "OA>Interview");

        // Switching to on-campus drops the referral.
        var update = application("Acme", "Interview");
        update.put("openingType", "ON_CAMPUS");
        JsonNode updated = call(put("/api/applications/" + id), token, update, 200).get("application");
        assertThat(updated.get("referral").asBoolean()).isFalse();

        // Interviews: add two (returned sorted), reschedule one, delete one.
        Instant later = Instant.now().plus(3, ChronoUnit.DAYS).truncatedTo(ChronoUnit.SECONDS);
        Instant sooner = Instant.now().plus(1, ChronoUnit.DAYS).truncatedTo(ChronoUnit.SECONDS);
        call(post("/api/applications/" + id + "/interviews"), token,
                java.util.Map.of("round", "Onsite", "scheduledAt", later.toString(), "timeZone", "Asia/Kolkata"), 201);
        JsonNode withTwo = call(post("/api/applications/" + id + "/interviews"), token,
                java.util.Map.of("scheduledAt", sooner.toString(), "location", "https://meet.example.com/x"), 201)
                .get("application");
        JsonNode interviews = withTwo.get("interviews");
        assertThat(interviews).extracting(i -> i.get("round").asText()).containsExactly("Interview", "Onsite");
        assertThat(interviews.get(1).get("time_zone").asText()).isEqualTo("Asia/Kolkata");
        long onsiteId = interviews.get(1).get("id").asLong();
        long firstId = interviews.get(0).get("id").asLong();

        Instant earliest = Instant.now().plus(2, ChronoUnit.HOURS).truncatedTo(ChronoUnit.SECONDS);
        JsonNode rescheduled = call(put("/api/applications/" + id + "/interviews/" + onsiteId), token,
                java.util.Map.of("round", "Onsite", "scheduledAt", earliest.toString()), 200).get("application");
        assertThat(rescheduled.get("interviews").get(0).get("round").asText()).isEqualTo("Onsite");

        JsonNode afterDelete = call(delete("/api/applications/" + id + "/interviews/" + firstId), token, null, 200)
                .get("application");
        assertThat(afterDelete.get("interviews").size()).isEqualTo(1);

        // Archive, then the list still returns it with archived=true.
        call(patch("/api/applications/" + id + "/archive"), token, java.util.Map.of("archived", true), 200);
        JsonNode list = call(get("/api/applications"), token, null, 200).get("applications");
        assertThat(list.get(0).get("archived").asBoolean()).isTrue();

        // A second application, then analytics.
        call(post("/api/applications"), token, application("Beta", "Applied"), 201);
        JsonNode analytics = call(get("/api/analytics"), token, null, 200);
        assertThat(analytics.get("total").asInt()).isEqualTo(2);
        assertThat(analytics.get("archived").asInt()).isEqualTo(1);
        assertThat(analytics.get("interview_rate").asDouble()).isEqualTo(50.0);
        assertThat(analytics.get("weekly").size()).isEqualTo(12);
        assertThat(analytics.get("by_tag").get(0).get("label").asText()).isEqualTo("dream company");

        // Another user cannot see or touch it.
        String other = signup("other@example.com");
        call(get("/api/applications/" + id), other, null, 404);
        call(get("/api/applications/" + id + "/history"), other, null, 404);
        call(post("/api/applications/" + id + "/interviews"), other,
                java.util.Map.of("scheduledAt", later.toString()), 404);
        assertThat(call(get("/api/analytics"), other, null, 200).get("total").asInt()).isZero();

        // Deleting cascades (interviews, tags, history) without errors.
        call(delete("/api/applications/" + id), token, null, 200);
        call(get("/api/applications/" + id + "/history"), token, null, 404);
    }

    @Test
    void validationRejectsBadNewFields() throws Exception {
        String token = signup("validation@example.com");
        var badUrl = application("Acme", "Applied");
        badUrl.put("jobUrl", "javascript:alert(1)");
        JsonNode err = call(post("/api/applications"), token, badUrl, 400);
        assertThat(err.get("error").asText()).contains("jobUrl");

        var badType = application("Acme", "Applied");
        badType.put("openingType", "SOMEWHERE");
        call(post("/api/applications"), token, badType, 400);

        var tooManyTags = application("Acme", "Applied");
        tooManyTags.put("tags", List.of("1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"));
        call(post("/api/applications"), token, tooManyTags, 400);

        long id = call(post("/api/applications"), token, application("Acme", "Applied"), 201)
                .get("application").get("id").asLong();
        call(post("/api/applications/" + id + "/interviews"), token, java.util.Map.of("round", "No date"), 400);
        call(delete("/api/applications/" + id + "/interviews/999999"), token, null, 404);
    }

    @Test
    void passwordResetFlow() throws Exception {
        signup("reset@example.com");

        // Unknown emails get the same response and no email.
        call(post("/api/auth/forgot-password"), null, java.util.Map.of("email", "nobody@example.com"), 200);
        call(post("/api/auth/forgot-password"), null, java.util.Map.of("email", "RESET@example.com"), 200);
        Mail mail = awaitMail();
        assertThat(OUTBOX).hasSize(1);
        assertThat(mail.to()).isEqualTo("reset@example.com");

        Matcher m = Pattern.compile("https://app\\.example\\.com/reset-password\\?token=([A-Za-z0-9_-]+)")
                .matcher(mail.text());
        assertThat(m.find()).isTrue();
        String resetToken = m.group(1);

        call(post("/api/auth/reset-password"), null,
                java.util.Map.of("token", resetToken, "password", "brand-new-pass"), 200);
        // Single use.
        call(post("/api/auth/reset-password"), null,
                java.util.Map.of("token", resetToken, "password", "another-pass"), 400);

        call(post("/api/auth/login"), null,
                java.util.Map.of("email", "reset@example.com", "password", "secret123"), 401);
        call(post("/api/auth/login"), null,
                java.util.Map.of("email", "reset@example.com", "password", "brand-new-pass"), 200);
    }

    @Test
    void remindersAreSentOnceForInterviewsInTheNextDay() throws Exception {
        String token = signup("remind@example.com");
        long id = call(post("/api/applications"), token, application("RemindCo", "Interview"), 201)
                .get("application").get("id").asLong();
        Instant soon = Instant.now().plus(5, ChronoUnit.HOURS);
        Instant farAway = Instant.now().plus(5, ChronoUnit.DAYS);
        call(post("/api/applications/" + id + "/interviews"), token, java.util.Map.of(
                "round", "Technical Round", "scheduledAt", soon.toString(), "timeZone", "Asia/Kolkata",
                "location", "Zoom"), 201);
        call(post("/api/applications/" + id + "/interviews"), token,
                java.util.Map.of("scheduledAt", farAway.toString()), 201);

        assertThat(reminderService.sendDueReminders()).isEqualTo(1);
        assertThat(OUTBOX).hasSize(1);
        Mail mail = OUTBOX.get(0);
        assertThat(mail.to()).isEqualTo("remind@example.com");
        assertThat(mail.subject()).isEqualTo("Reminder: Technical Round with RemindCo");
        assertThat(mail.text()).contains("Where: Zoom").contains("IST").contains("https://app.example.com/dashboard");

        assertThat(reminderService.sendDueReminders()).isZero(); // not sent twice
    }

    private static Mail awaitMail() throws InterruptedException {
        for (int i = 0; i < 100 && OUTBOX.isEmpty(); i++) {
            Thread.sleep(50);
        }
        Thread.sleep(200); // give a (wrong) second email the chance to show up
        assertThat(OUTBOX).isNotEmpty();
        return OUTBOX.get(0);
    }
}

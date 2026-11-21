package com.applyrec.service;

import com.applyrec.entity.Application;
import com.applyrec.entity.Interview;
import com.applyrec.mail.EmailSender;
import com.applyrec.repository.InterviewRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

/** Emails a reminder about 24 hours before each scheduled interview. */
@Service
public class InterviewReminderService {

    private static final Logger log = LoggerFactory.getLogger(InterviewReminderService.class);
    static final Duration LOOKAHEAD = Duration.ofHours(24);
    private static final DateTimeFormatter WHEN =
            DateTimeFormatter.ofPattern("EEEE, d MMM yyyy 'at' h:mm a (zzz)", Locale.ENGLISH);

    private final InterviewRepository interviewRepository;
    private final EmailSender emailSender;
    private final Clock clock;
    private final String frontendUrl;

    public InterviewReminderService(InterviewRepository interviewRepository, EmailSender emailSender, Clock clock,
                                    @Value("${app.frontend-url}") String frontendUrl) {
        this.interviewRepository = interviewRepository;
        this.emailSender = emailSender;
        this.clock = clock;
        this.frontendUrl = frontendUrl.replaceAll("/+$", "");
    }

    @Scheduled(
            initialDelayString = "${app.reminders.initial-delay-ms:60000}",
            fixedDelayString = "${app.reminders.interval-ms:600000}")
    @Transactional
    public int sendDueReminders() {
        if (!emailSender.isEnabled()) {
            return 0; // don't mark reminders as sent when nothing can be delivered
        }
        Instant now = clock.instant();
        List<Interview> due = interviewRepository.findPendingReminders(now, now.plus(LOOKAHEAD));
        int sent = 0;
        for (Interview interview : due) {
            Application app = interview.getApplication();
            if (emailSender.send(app.getUser().getEmail(), subject(interview), body(interview))) {
                interview.setReminderSentAt(now);
                sent++;
            } // otherwise retried on the next run
        }
        if (!due.isEmpty()) {
            log.info("Sent {}/{} interview reminder(s)", sent, due.size());
        }
        return sent;
    }

    static String subject(Interview interview) {
        Application app = interview.getApplication();
        return "Reminder: " + interview.getRound() + " with " + app.getCompany();
    }

    String body(Interview interview) {
        Application app = interview.getApplication();
        ZoneId zone = ZoneId.of(ApplicationService.validZone(interview.getTimeZone()));
        StringBuilder sb = new StringBuilder()
                .append("Your ").append(interview.getRound()).append(" for ")
                .append(app.getRole()).append(" at ").append(app.getCompany()).append(" is coming up.\n\n")
                .append("When: ").append(WHEN.format(interview.getScheduledAt().atZone(zone))).append('\n');
        if (interview.getLocation() != null) {
            sb.append("Where: ").append(interview.getLocation()).append('\n');
        }
        if (interview.getNotes() != null) {
            sb.append("\nNotes:\n").append(interview.getNotes()).append('\n');
        }
        if (app.getJobUrl() != null) {
            sb.append("\nJob posting: ").append(app.getJobUrl()).append('\n');
        }
        sb.append("\nGood luck! Open ApplyRec: ").append(frontendUrl).append("/dashboard\n");
        return sb.toString();
    }
}

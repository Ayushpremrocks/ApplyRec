package com.applyrec.service;

import com.applyrec.dto.ApplicationDtos.CreateOrUpdateRequest;
import com.applyrec.entity.Application;
import com.applyrec.entity.StatusChange;
import com.applyrec.exception.BadRequestException;
import com.applyrec.exception.UnauthorizedException;
import com.applyrec.repository.ApplicationRepository;
import com.applyrec.repository.StatusChangeRepository;
import com.applyrec.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ApplicationServiceTest {

    private static final Instant NOW = Instant.parse("2025-06-01T10:00:00Z");

    private ApplicationRepository applicationRepository;
    private UserRepository userRepository;
    private StatusChangeRepository statusChangeRepository;
    private ApplicationService service;

    @BeforeEach
    void setUp() {
        applicationRepository = mock(ApplicationRepository.class);
        userRepository = mock(UserRepository.class);
        statusChangeRepository = mock(StatusChangeRepository.class);
        service = new ApplicationService(applicationRepository, userRepository, statusChangeRepository,
                Clock.fixed(NOW, ZoneOffset.UTC));
    }

    private static Application existing(String status, Instant updatedAt) {
        Application a = new Application();
        a.setId(1L);
        a.setStatus(status);
        a.setStatusUpdatedAt(updatedAt);
        return a;
    }

    private static CreateOrUpdateRequest request(String status) {
        return request(status, null, null, null);
    }

    private static CreateOrUpdateRequest request(String status, String openingType, Boolean referral, List<String> tags) {
        return new CreateOrUpdateRequest("  Acme ", "SWE", status, LocalDate.parse("2025-01-01"),
                "  ", true, "", new BigDecimal("12.5"), " ", openingType, referral, tags);
    }

    @Test
    void updateKeepsTimestampAndHistoryWhenStatusUnchanged() {
        Instant old = Instant.parse("2024-01-01T00:00:00Z");
        Application app = existing("Applied", old);
        when(applicationRepository.findByIdAndUserId(1L, 7L)).thenReturn(Optional.of(app));

        service.updateApplication(7L, 1L, request("Applied"));

        assertThat(app.getStatusUpdatedAt()).isEqualTo(old);
        assertThat(app.getCompany()).isEqualTo("Acme");
        assertThat(app.getNotes()).isNull();
        assertThat(app.getJobId()).isNull();
        assertThat(app.getJobUrl()).isNull();
        verify(statusChangeRepository, never()).save(any());
    }

    @Test
    void statusChangeBumpsTimestampAndRecordsHistory() {
        Application app = existing("Applied", Instant.parse("2024-01-01T00:00:00Z"));
        when(applicationRepository.findByIdAndUserId(1L, 7L)).thenReturn(Optional.of(app));

        service.updateApplicationStatus(7L, 1L, "Interview");

        assertThat(app.getStatus()).isEqualTo("Interview");
        assertThat(app.getStatusUpdatedAt()).isEqualTo(NOW);
        ArgumentCaptor<StatusChange> captor = ArgumentCaptor.forClass(StatusChange.class);
        verify(statusChangeRepository).save(captor.capture());
        assertThat(captor.getValue().getFromStatus()).isEqualTo("Applied");
        assertThat(captor.getValue().getToStatus()).isEqualTo("Interview");
        assertThat(captor.getValue().getChangedAt()).isEqualTo(NOW);
    }

    @Test
    void referralIsOnlyKeptForOffCampusOpenings() {
        Application app = existing("Applied", NOW);
        when(applicationRepository.findByIdAndUserId(1L, 7L)).thenReturn(Optional.of(app));

        service.updateApplication(7L, 1L, request("Applied", "ON_CAMPUS", true, null));
        assertThat(app.getOpeningType()).isEqualTo("ON_CAMPUS");
        assertThat(app.isReferral()).isFalse();

        service.updateApplication(7L, 1L, request("Applied", "OFF_CAMPUS", true, null));
        assertThat(app.isReferral()).isTrue();

        service.updateApplication(7L, 1L, request("Applied", "", true, null));
        assertThat(app.getOpeningType()).isNull();
        assertThat(app.isReferral()).isFalse();
    }

    @Test
    void tagsAreNormalisedAndNullLeavesThemUntouched() {
        Application app = existing("Applied", NOW);
        when(applicationRepository.findByIdAndUserId(1L, 7L)).thenReturn(Optional.of(app));

        service.updateApplication(7L, 1L, request("Applied", null, null,
                Arrays.asList(" Remote ", "remote", "Dream   Company", "", null)));
        assertThat(app.getTags()).containsExactly("dream company", "remote");

        service.updateApplication(7L, 1L, request("Applied", null, null, null));
        assertThat(app.getTags()).containsExactly("dream company", "remote");

        service.updateApplication(7L, 1L, request("Applied", null, null, List.of()));
        assertThat(app.getTags()).isEmpty();
    }

    @Test
    void invalidTimeZonesFallBackToUtc() {
        assertThat(ApplicationService.validZone("Asia/Kolkata")).isEqualTo("Asia/Kolkata");
        assertThat(ApplicationService.validZone("Not/AZone")).isEqualTo("UTC");
        assertThat(ApplicationService.validZone(null)).isEqualTo("UTC");
    }

    @Test
    void deletedUserGetsUnauthorized() {
        when(userRepository.existsById(7L)).thenReturn(false);
        assertThatThrownBy(() -> service.getApplications(7L, null, null, null, null))
                .isInstanceOf(UnauthorizedException.class);

        when(userRepository.findById(7L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.createApplication(7L, request("Applied")))
                .isInstanceOf(UnauthorizedException.class);
        verify(applicationRepository, never()).save(any());
    }

    @Test
    void rejectsInvalidStatusFilterAndInvertedSalaryRange() {
        when(userRepository.existsById(7L)).thenReturn(true);
        assertThatThrownBy(() -> service.getApplications(7L, "Nope", null, null, null))
                .isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> service.getApplications(7L, null, null, BigDecimal.TEN, BigDecimal.ONE))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void blankFiltersAreTreatedAsAbsent() {
        when(userRepository.existsById(7L)).thenReturn(true);
        service.getApplications(7L, " ", "", null, null);
        verify(applicationRepository).findByUserWithFilters(7L, null, null, null, null);
    }
}

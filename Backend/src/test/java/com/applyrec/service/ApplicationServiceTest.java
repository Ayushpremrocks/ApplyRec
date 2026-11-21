package com.applyrec.service;

import com.applyrec.dto.ApplicationDtos.CreateOrUpdateRequest;
import com.applyrec.entity.Application;
import com.applyrec.exception.BadRequestException;
import com.applyrec.exception.UnauthorizedException;
import com.applyrec.repository.ApplicationRepository;
import com.applyrec.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ApplicationServiceTest {

    private ApplicationRepository applicationRepository;
    private UserRepository userRepository;
    private ApplicationService service;

    @BeforeEach
    void setUp() {
        applicationRepository = mock(ApplicationRepository.class);
        userRepository = mock(UserRepository.class);
        service = new ApplicationService(applicationRepository, userRepository);
    }

    private static Application existing(String status, Instant updatedAt) {
        Application a = new Application();
        a.setStatus(status);
        a.setStatusUpdatedAt(updatedAt);
        return a;
    }

    private static CreateOrUpdateRequest request(String status) {
        return new CreateOrUpdateRequest("  Acme ", "SWE", status, LocalDate.parse("2025-01-01"),
                "  ", true, "", new BigDecimal("12.5"));
    }

    @Test
    void updateKeepsTimestampWhenStatusUnchanged() {
        Instant old = Instant.parse("2024-01-01T00:00:00Z");
        Application app = existing("Applied", old);
        when(applicationRepository.findByIdAndUserId(1L, 7L)).thenReturn(Optional.of(app));

        service.updateApplication(7L, 1L, request("Applied"));

        assertThat(app.getStatusUpdatedAt()).isEqualTo(old);
        assertThat(app.getCompany()).isEqualTo("Acme");
        assertThat(app.getNotes()).isNull();
        assertThat(app.getJobId()).isNull();
    }

    @Test
    void statusChangeBumpsTimestamp() {
        Instant old = Instant.parse("2024-01-01T00:00:00Z");
        Application app = existing("Applied", old);
        when(applicationRepository.findByIdAndUserId(1L, 7L)).thenReturn(Optional.of(app));

        service.updateApplicationStatus(7L, 1L, "Interview");

        assertThat(app.getStatus()).isEqualTo("Interview");
        assertThat(app.getStatusUpdatedAt()).isAfter(old);
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

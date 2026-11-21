package com.applyrec.controller;

import com.applyrec.config.CorsConfig;
import com.applyrec.config.SecurityConfig;
import com.applyrec.entity.Application;
import com.applyrec.exception.NotFoundException;
import com.applyrec.security.JwtAuthenticationFilter;
import com.applyrec.security.JwtService;
import com.applyrec.service.ApplicationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ApplicationController.class)
@Import({SecurityConfig.class, CorsConfig.class, JwtAuthenticationFilter.class, JwtService.class})
@TestPropertySource(properties = {
        "app.jwt.secret=test-secret-that-is-definitely-32-bytes-long",
        "app.cors.allowed-origins=https://app.example.com"
})
class ApplicationControllerTest {

    private static final String VALID_BODY =
            "{\"company\":\"Acme\",\"role\":\"SWE\",\"status\":\"Applied\",\"appliedDate\":\"2025-01-01\",\"salary\":12.5}";

    @Autowired
    MockMvc mvc;
    @Autowired
    JwtService jwtService;
    @MockBean
    ApplicationService applicationService;

    private String bearer() {
        return "Bearer " + jwtService.generateToken(7L);
    }

    @Test
    void missingTokenReturns401Json() throws Exception {
        mvc.perform(get("/api/applications"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Authentication required"));
    }

    @Test
    void invalidTokenReturns401() throws Exception {
        mvc.perform(get("/api/applications").header("Authorization", "Bearer garbage"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void decimalSalaryFiltersAreAccepted() throws Exception {
        when(applicationService.getApplications(any(), any(), any(), any(), any())).thenReturn(List.of());

        mvc.perform(get("/api/applications?minSalary=12.5&maxSalary=20.75").header("Authorization", bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.applications").isArray());

        verify(applicationService).getApplications(eq(7L), isNull(), isNull(),
                eq(new BigDecimal("12.5")), eq(new BigDecimal("20.75")));
    }

    @Test
    void nonNumericSalaryReturns400Json() throws Exception {
        mvc.perform(get("/api/applications?minSalary=abc").header("Authorization", bearer()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", containsString("minSalary")));
    }

    @Test
    void validationErrorsReturn400JsonNot403() throws Exception {
        mvc.perform(post("/api/applications").header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"company\":\"\",\"role\":\"SWE\",\"status\":\"Bogus\",\"appliedDate\":\"2025-01-01\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", containsString("company")))
                .andExpect(jsonPath("$.error", containsString("status")));
    }

    @Test
    void salaryAboveColumnLimitReturns400() throws Exception {
        mvc.perform(post("/api/applications").header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_BODY.replace("12.5", "10000")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", containsString("salary")));
    }

    @Test
    void malformedJsonReturns400() throws Exception {
        mvc.perform(post("/api/applications").header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON).content("{nope"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Malformed request body"));
    }

    @Test
    void createReturns201WithApplication() throws Exception {
        Application app = new Application();
        app.setId(99L);
        app.setCompany("Acme");
        app.setRole("SWE");
        app.setStatus("Applied");
        app.setAppliedDate(LocalDate.parse("2025-01-01"));
        when(applicationService.createApplication(eq(7L), any())).thenReturn(app);

        mvc.perform(post("/api/applications").header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON).content(VALID_BODY))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.applicationId").value(99))
                .andExpect(jsonPath("$.application.applied_date").value("2025-01-01"));
    }

    @Test
    void notFoundReturns404Json() throws Exception {
        when(applicationService.getApplication(7L, 5L)).thenThrow(new NotFoundException("Application not found"));
        mvc.perform(get("/api/applications/5").header("Authorization", bearer()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Application not found"));
    }

    @Test
    void corsAllowsOnlyConfiguredOrigin() throws Exception {
        mvc.perform(options("/api/applications")
                        .header("Origin", "https://app.example.com")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "https://app.example.com"));

        mvc.perform(options("/api/applications")
                        .header("Origin", "https://evil.example.org")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isForbidden());
    }
}

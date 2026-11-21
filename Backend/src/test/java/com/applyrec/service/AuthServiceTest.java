package com.applyrec.service;

import com.applyrec.entity.User;
import com.applyrec.exception.ConflictException;
import com.applyrec.repository.UserRepository;
import com.applyrec.security.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthServiceTest {

    private final UserRepository users = mock(UserRepository.class);
    private final AuthService service = new AuthService(users, new BCryptPasswordEncoder(4),
            new JwtService("test-secret-that-is-definitely-32-bytes-long", 7));

    @Test
    void signupNormalisesEmail() {
        when(users.saveAndFlush(any())).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(1L);
            return u;
        });

        var response = service.signup("  Alice@Example.COM ", "secret1");

        assertThat(response.user().email()).isEqualTo("alice@example.com");
        verify(users).existsByEmailIgnoreCase("alice@example.com");
    }

    @Test
    void concurrentDuplicateSignupBecomesConflict() {
        when(users.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("duplicate key"));
        assertThatThrownBy(() -> service.signup("a@b.com", "secret1"))
                .isInstanceOf(ConflictException.class);
    }
}

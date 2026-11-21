package com.applyrec.service;

import com.applyrec.dto.AuthDtos.AuthResponse;
import com.applyrec.dto.AuthDtos.UserInfo;
import com.applyrec.entity.User;
import com.applyrec.exception.ConflictException;
import com.applyrec.exception.UnauthorizedException;
import com.applyrec.repository.UserRepository;
import com.applyrec.security.JwtService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
public class AuthService {

    private static final String EMAIL_TAKEN = "Email already registered";
    private static final String BAD_CREDENTIALS = "Invalid email or password";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse signup(String rawEmail, String password) {
        String email = normalizeEmail(rawEmail);
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ConflictException(EMAIL_TAKEN);
        }

        User user = new User();
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        User saved;
        try {
            // saveAndFlush so a concurrent signup with the same email fails here, not at commit.
            saved = userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException ex) {
            throw new ConflictException(EMAIL_TAKEN);
        }

        return new AuthResponse("User created successfully",
                new UserInfo(saved.getId(), saved.getEmail()), jwtService.generateToken(saved.getId()));
    }

    @Transactional(readOnly = true)
    public AuthResponse login(String rawEmail, String password) {
        User user = userRepository.findByEmailIgnoreCase(normalizeEmail(rawEmail))
                .orElseThrow(() -> new UnauthorizedException(BAD_CREDENTIALS));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new UnauthorizedException(BAD_CREDENTIALS);
        }

        return new AuthResponse("Login successful",
                new UserInfo(user.getId(), user.getEmail()), jwtService.generateToken(user.getId()));
    }

    static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}

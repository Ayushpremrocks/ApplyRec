package com.applyrec.security;

/** The authenticated caller, as identified by the JWT. */
public record UserPrincipal(Long userId) {
}

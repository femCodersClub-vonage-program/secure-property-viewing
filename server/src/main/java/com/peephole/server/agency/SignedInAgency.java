package com.peephole.server.agency;

import org.springframework.security.core.Authentication;

/** The signed-in agency user and their agency, for features that serve agency endpoints under /api/agency/**. */
public final class SignedInAgency {

    private SignedInAgency() {}

    public static long idOf(Authentication authentication) {
        return userOf(authentication).getAgencyId();
    }

    public static long userIdOf(Authentication authentication) {
        return userOf(authentication).getUserId();
    }

    private static AgencyUserDetails userOf(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof AgencyUserDetails user) {
            return user;
        }
        // SecurityConfig only lets signed-in agency users reach /api/agency/**, so this is a programming error
        throw new IllegalStateException("The request has no signed-in agency user");
    }
}

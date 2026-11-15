package com.peephole.server.agency;

import java.util.Collection;
import java.util.List;
import org.springframework.security.core.CredentialsContainer;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

/** The signed-in agency user, kept in the session. The password hash is erased after a successful sign-in. */
final class AgencyUserDetails implements UserDetails, CredentialsContainer {

    private final String email;
    private final String fullName;
    private final AgencyUserRole role;
    private String passwordHash;

    AgencyUserDetails(AgencyUser user) {
        this.email = user.getEmail();
        this.fullName = user.getFullName();
        this.role = user.getRole();
        this.passwordHash = user.getPasswordHash();
    }

    String getFullName() {
        return fullName;
    }

    AgencyUserRole getRole() {
        return role;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public void eraseCredentials() {
        passwordHash = null;
    }
}

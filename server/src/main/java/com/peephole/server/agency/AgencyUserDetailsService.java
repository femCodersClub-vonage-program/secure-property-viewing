package com.peephole.server.agency;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class AgencyUserDetailsService implements UserDetailsService {

    private final AgencyUserRepository agencyUserRepository;

    AgencyUserDetailsService(AgencyUserRepository agencyUserRepository) {
        this.agencyUserRepository = agencyUserRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) {
        return agencyUserRepository
                .findByEmail(email)
                .map(AgencyUserDetails::new)
                .orElseThrow(() -> new UsernameNotFoundException("Agency user not found"));
    }
}

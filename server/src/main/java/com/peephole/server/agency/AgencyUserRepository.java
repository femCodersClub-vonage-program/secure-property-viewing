package com.peephole.server.agency;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface AgencyUserRepository extends JpaRepository<AgencyUser, Long> {

    Optional<AgencyUser> findByEmail(String email);
}

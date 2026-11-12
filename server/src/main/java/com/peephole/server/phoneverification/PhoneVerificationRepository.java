package com.peephole.server.phoneverification;

import java.time.OffsetDateTime;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PhoneVerificationRepository extends JpaRepository<PhoneVerification, Long> {
    long countByPhoneHashAndCreatedAtAfter(String phoneHash, OffsetDateTime since);

    long countByCreatedAtAfter(OffsetDateTime since);
}

package com.peephole.server.phoneverification;

import jakarta.persistence.LockModeType;
import java.time.OffsetDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

interface PhoneVerificationRepository extends JpaRepository<PhoneVerification, Long> {

    long countByPhoneHashAndCreatedAtAfter(String phoneHash, OffsetDateTime since);

    long countByCreatedAtAfter(OffsetDateTime since);

    // Locks the row until the transaction ends, so two requests never change the same verification at once
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<PhoneVerification> findWithLockById(long id);
}

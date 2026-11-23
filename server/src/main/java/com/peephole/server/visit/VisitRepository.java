package com.peephole.server.visit;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface VisitRepository extends JpaRepository<Visit, Long> {

    // Locks the row until the transaction ends, so two requests never change the same visit at once
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Visit> findWithLockById(long id);

    @Query(
            value = "SELECT EXISTS(SELECT 1 FROM visit WHERE phone_verification_id = :verificationId)",
            nativeQuery = true)
    boolean existsByPhoneVerificationId(@Param("verificationId") long verificationId);
}

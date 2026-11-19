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

    // Reads the property table directly until the catalog (#52) exposes the agency of a property in its service
    @Query(value = "SELECT agency_id FROM property WHERE id = :propertyId", nativeQuery = true)
    long findAgencyIdOfProperty(long propertyId);

    @Query(
            value = "SELECT EXISTS(SELECT 1 FROM property WHERE id = :propertyId AND status = 'ACTIVE')",
            nativeQuery = true)
    // Reads the property table directly until the catalog (#52) exposes it in its service
    boolean existsActiveProperty(long propertyId);

    @Query(value = """
                    SELECT p.id AS "propertyId", p.title AS title, p.area AS area, p.address AS address
                    FROM property p
                    JOIN visit_slot s ON s.property_id = p.id
                    WHERE s.id = :slotId
                    """, nativeQuery = true)
    // Reads the property table directly until the catalog (#52) exposes it in its service
    VisitPropertySummary findPropertySummaryBySlotId(long slotId);

    @Query(
            value = "SELECT EXISTS(SELECT 1 FROM visit WHERE phone_verification_id = :verificationId)",
            nativeQuery = true)
    boolean existsByPhoneVerificationId(@Param("verificationId") long verificationId);
}

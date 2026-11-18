package com.peephole.server.visit;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

interface VisitRepository extends JpaRepository<Visit, Long> {

    // Locks the row until the transaction ends, so two requests never change the same visit at once
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Visit> findWithLockById(long id);

    // Reads the property table directly until the catalog (#52) exposes the agency of a property in its service
    @Query(value = "SELECT agency_id FROM property WHERE id = :propertyId", nativeQuery = true)
    long findAgencyIdOfProperty(long propertyId);
}

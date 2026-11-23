package com.peephole.server.visit;

import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

interface VisitSlotRepository extends JpaRepository<VisitSlot, Long> {

    @Query(value = """
                    SELECT s.id AS "id", s.starts_at AS "startsAt", s.ends_at AS "endsAt"
                    FROM visit_slot s
                    JOIN property p ON p.id = s.property_id
                    WHERE s.property_id = :propertyId
                      AND p.status = 'ACTIVE'
                      AND s.status = 'AVAILABLE'
                      AND s.starts_at > :now
                      AND s.starts_at >= :fromInclusive
                      AND s.starts_at < :toExclusive
                    ORDER BY s.starts_at
                    """, nativeQuery = true)
    List<AvailableVisitSlot> findAvailable(
            long propertyId, OffsetDateTime now, OffsetDateTime fromInclusive, OffsetDateTime toExclusive);

    // Checks the property's status inside the UPDATE, not through PropertyService, so booking stays atomic
    @Modifying
    @Transactional(propagation = Propagation.MANDATORY)
    @Query(value = """
                    UPDATE visit_slot s
                    SET status = 'BOOKED'
                    WHERE s.id = :slotId
                      AND s.status = 'AVAILABLE'
                      AND s.starts_at > :now
                      AND EXISTS (
                          SELECT 1
                          FROM property p
                          WHERE p.id = s.property_id
                            AND p.status = 'ACTIVE'
                      )
                    """, nativeQuery = true)
    int bookIfAvailable(@Param("slotId") long slotId, @Param("now") OffsetDateTime now);
}

package com.peephole.server.videovisit;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

interface VideoAccessRepository extends JpaRepository<VideoAccess, Long> {

    Optional<VideoAccess> findByTokenHash(String tokenHash);

    long countByVisitIdAndRole(long visitId, VideoRole role);

    // A bulk delete runs at once, before the new link is inserted, so the one-visitor index never sees two rows
    @Modifying
    @Query("DELETE FROM VideoAccess access WHERE access.visitId = :visitId AND access.role = :role")
    void deleteByVisitIdAndRole(long visitId, VideoRole role);
}

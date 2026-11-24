package com.peephole.server.postvisitcall;

import jakarta.persistence.LockModeType;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

interface PostVisitCallRepository extends JpaRepository<PostVisitCall, Long> {

    // Both webhooks and the dialer lock the row, so a key and a status change arriving together are applied one
    // after the other and the key always wins
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM PostVisitCall c WHERE c.id = :id")
    Optional<PostVisitCall> findWithLockById(long id);

    @Query("""
            SELECT c FROM PostVisitCall c
            WHERE c.answer = com.peephole.server.postvisitcall.PostVisitCallAnswer.ASKED_FOR_MONEY
              AND c.answeredAt > :since
            ORDER BY c.answeredAt DESC, c.id DESC
            """)
    List<PostVisitCall> findAskedForMoneySince(OffsetDateTime since);
}

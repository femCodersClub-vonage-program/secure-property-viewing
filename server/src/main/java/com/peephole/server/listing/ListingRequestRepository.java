package com.peephole.server.listing;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface ListingRequestRepository extends JpaRepository<ListingRequest, Long> {
    boolean existsByPhoneVerificationId(long phoneVerificationId);

    List<ListingRequest> findAllByOrderByCreatedAtDescIdDesc();

    List<ListingRequest> findAllByStatusOrderByCreatedAtDescIdDesc(ListingRequestStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM ListingRequest r WHERE r.id = :id")
    Optional<ListingRequest> findWithLockById(@Param("id") long id);
}

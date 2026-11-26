package com.peephole.server.listing;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface ListingRequestRepository extends JpaRepository<ListingRequest, Long> {
    boolean existsByPhoneVerificationId(long phoneVerificationId);

    List<ListingRequest> findAllByOrderByCreatedAtDescIdDesc();

    List<ListingRequest> findAllByStatusOrderByCreatedAtDescIdDesc(ListingRequestStatus status);
}

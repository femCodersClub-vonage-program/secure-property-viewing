package com.peephole.server.listing;

import org.springframework.data.jpa.repository.JpaRepository;

interface ListingRequestRepository extends JpaRepository<ListingRequest, Long> {
    boolean existsByPhoneVerificationId(long phoneVerificationId);
}

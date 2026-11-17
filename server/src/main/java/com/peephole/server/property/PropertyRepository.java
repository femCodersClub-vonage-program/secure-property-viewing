package com.peephole.server.property;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface PropertyRepository extends JpaRepository<Property, Long> {

    @Query("SELECT p FROM Property p JOIN FETCH p.agency WHERE p.status = 'ACTIVE'")
    List<Property> findAllActive();

    @Query("SELECT p FROM Property p JOIN FETCH p.agency WHERE p.status = 'ACTIVE' AND p.operation = :operation")
    List<Property> findAllActiveByOperation(@Param("operation") PropertyOperation operation);

    @Query(
            "SELECT p FROM Property p JOIN FETCH p.agency LEFT JOIN FETCH p.images WHERE p.id = :id AND p.status = 'ACTIVE'")
    Optional<Property> findActiveById(@Param("id") long id);
}

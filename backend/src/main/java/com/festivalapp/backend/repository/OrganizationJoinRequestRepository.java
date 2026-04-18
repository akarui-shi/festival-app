package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.OrganizationJoinRequest;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OrganizationJoinRequestRepository extends JpaRepository<OrganizationJoinRequest, Long> {

    @EntityGraph(attributePaths = {"user", "organization", "organization.city", "reviewedByUser"})
    List<OrganizationJoinRequest> findAllByOrganizationIdOrderByRequestedAtDesc(Long organizationId);

    @EntityGraph(attributePaths = {"user", "organization", "organization.city", "reviewedByUser"})
    List<OrganizationJoinRequest> findAllByUserIdOrderByRequestedAtDesc(Long userId);

    @EntityGraph(attributePaths = {"user", "organization", "organization.city", "reviewedByUser"})
    List<OrganizationJoinRequest> findAllByStatusOrderByRequestedAtDesc(String status);

    boolean existsByUserIdAndOrganizationIdAndStatus(Long userId, Long organizationId, String status);

    Optional<OrganizationJoinRequest> findByIdAndStatus(Long id, String status);
}

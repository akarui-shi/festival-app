package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.OrganizationMember;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OrganizationMemberRepository extends JpaRepository<OrganizationMember, Long> {

    @EntityGraph(attributePaths = {"organization", "organization.city"})
    List<OrganizationMember> findAllByUserIdAndLeftAtIsNull(Long userId);

    @EntityGraph(attributePaths = {"organization", "organization.city"})
    Optional<OrganizationMember> findFirstByUserIdAndOrganizationStatusAndLeftAtIsNull(Long userId, String status);

    boolean existsByUserIdAndOrganizationIdAndLeftAtIsNull(Long userId, Long organizationId);
}

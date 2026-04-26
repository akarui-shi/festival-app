package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.OrganizationFollow;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrganizationFollowRepository extends JpaRepository<OrganizationFollow, OrganizationFollow.OrganizationFollowId> {

    boolean existsByUserIdAndOrganizationId(Long userId, Long organizationId);

    void deleteByUserIdAndOrganizationId(Long userId, Long organizationId);

    long countByOrganizationId(Long organizationId);
}

package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.OrganizationImage;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OrganizationImageRepository extends JpaRepository<OrganizationImage, Long> {

    @EntityGraph(attributePaths = {"image"})
    Optional<OrganizationImage> findFirstByOrganizationIdAndLogoIsTrueOrderByIdAsc(Long organizationId);

    void deleteByOrganizationId(Long organizationId);
}

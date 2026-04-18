package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.Organization;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OrganizationRepository extends JpaRepository<Organization, Long> {

    Optional<Organization> findByNameIgnoreCase(String name);

    @EntityGraph(attributePaths = {"city"})
    List<Organization> findAllByDeletedAtIsNullOrderByNameAsc();

    @EntityGraph(attributePaths = {"city"})
    List<Organization> findAllByNameContainingIgnoreCaseAndDeletedAtIsNullOrderByNameAsc(String name);

    @EntityGraph(attributePaths = {"city"})
    Optional<Organization> findByIdAndDeletedAtIsNull(Long id);
}

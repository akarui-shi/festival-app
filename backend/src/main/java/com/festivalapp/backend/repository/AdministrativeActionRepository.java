package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.AdministrativeAction;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AdministrativeActionRepository extends JpaRepository<AdministrativeAction, Long> {

    @EntityGraph(attributePaths = {"admin"})
    List<AdministrativeAction> findTop200ByOrderByCreatedAtDesc();
}

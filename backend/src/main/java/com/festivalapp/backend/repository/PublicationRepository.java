package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.Publication;
import com.festivalapp.backend.entity.PublicationStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.domain.Sort;

import java.util.List;
import java.util.Optional;

public interface PublicationRepository extends JpaRepository<Publication, Long>, JpaSpecificationExecutor<Publication> {

    @EntityGraph(attributePaths = {"author", "event"})
    List<Publication> findByStatusOrderByCreatedAtDesc(PublicationStatus status);

    @EntityGraph(attributePaths = {"author", "event"})
    Optional<Publication> findWithAuthorAndEventById(Long id);

    @EntityGraph(attributePaths = {"author", "event"})
    List<Publication> findAll(Specification<Publication> specification, Sort sort);
}

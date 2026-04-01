package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.Publication;
import com.festivalapp.backend.entity.PublicationStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PublicationRepository extends JpaRepository<Publication, Long>, JpaSpecificationExecutor<Publication> {

    @EntityGraph(attributePaths = {"author", "event"})
    List<Publication> findByStatusOrderByCreatedAtDesc(PublicationStatus status);

    @EntityGraph(attributePaths = {"author", "event"})
    Optional<Publication> findWithAuthorAndEventById(Long id);

    @EntityGraph(attributePaths = {"author", "event"})
    List<Publication> findAll(Specification<Publication> specification, Sort sort);

    @Modifying
    @Query("delete from Publication p where p.event.id = :eventId")
    void deleteByEventId(@Param("eventId") Long eventId);
}

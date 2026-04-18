package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.PublicationImage;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PublicationImageRepository extends JpaRepository<PublicationImage, Long> {

    @EntityGraph(attributePaths = {"image"})
    List<PublicationImage> findAllByPublicationIdOrderBySortOrderAscIdAsc(Long publicationId);

    void deleteByPublicationId(Long publicationId);
}

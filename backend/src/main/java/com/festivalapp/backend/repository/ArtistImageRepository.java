package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.ArtistImage;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ArtistImageRepository extends JpaRepository<ArtistImage, Long> {

    @EntityGraph(attributePaths = {"image"})
    Optional<ArtistImage> findFirstByArtistIdAndPrimaryIsTrueOrderByIdAsc(Long artistId);

    @EntityGraph(attributePaths = {"image"})
    List<ArtistImage> findAllByArtistIdOrderByPrimaryDescIdAsc(Long artistId);

    void deleteByArtistId(Long artistId);
}

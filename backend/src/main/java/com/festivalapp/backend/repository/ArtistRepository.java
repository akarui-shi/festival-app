package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.Artist;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ArtistRepository extends JpaRepository<Artist, Long> {

    List<Artist> findAllByDeletedAtIsNullOrderByNameAsc();

    List<Artist> findAllByNameContainingIgnoreCaseAndDeletedAtIsNullOrderByNameAsc(String name);

    Optional<Artist> findByIdAndDeletedAtIsNull(Long id);
}

package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.Venue;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VenueRepository extends JpaRepository<Venue, Long> {

    @EntityGraph(attributePaths = {"city"})
    List<Venue> findAllByOrderByNameAsc();
}

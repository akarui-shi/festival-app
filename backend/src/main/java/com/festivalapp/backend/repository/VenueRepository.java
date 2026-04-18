package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.Venue;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface VenueRepository extends JpaRepository<Venue, Long> {

    @EntityGraph(attributePaths = {"city"})
    List<Venue> findAllByOrderByNameAsc();

    @EntityGraph(attributePaths = {"city"})
    List<Venue> findAllByCityIdOrderByNameAsc(Long cityId);

    Optional<Venue> findFirstByAddressIgnoreCaseAndCityId(String address, Long cityId);
}

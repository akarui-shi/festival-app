package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.City;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CityRepository extends JpaRepository<City, Long> {

    List<City> findAllByOrderByNameAsc();

    Optional<City> findFirstByNameIgnoreCaseAndRegionIgnoreCaseAndCountryIgnoreCase(String name, String region, String country);

    Optional<City> findFirstByNameIgnoreCase(String name);
}

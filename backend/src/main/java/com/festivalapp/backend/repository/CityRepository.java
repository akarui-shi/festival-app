package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.City;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface CityRepository extends JpaRepository<City, Long> {

    List<City> findAllByOrderByNameAsc();

    Optional<City> findFirstByNameIgnoreCaseAndRegionIgnoreCase(String name, String region);

    Optional<City> findFirstByNameIgnoreCase(String name);

    @Query("""
        select c from City c
        where (:q is null or lower(c.name) like lower(concat('%', :q, '%')))
        order by c.name asc
        """)
    List<City> search(String q);
}

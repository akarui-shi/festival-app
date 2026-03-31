package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.Publication;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PublicationRepository extends JpaRepository<Publication, Long> {
}

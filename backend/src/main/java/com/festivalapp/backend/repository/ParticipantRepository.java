package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.Participant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ParticipantRepository extends JpaRepository<Participant, Long> {

    List<Participant> findAllByDeletedAtIsNullOrderByNameAsc();

    List<Participant> findAllByNameContainingIgnoreCaseAndDeletedAtIsNullOrderByNameAsc(String name);

    Optional<Participant> findByIdAndDeletedAtIsNull(Long id);
}

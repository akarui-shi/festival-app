package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.ParticipantImage;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ParticipantImageRepository extends JpaRepository<ParticipantImage, Long> {

    @EntityGraph(attributePaths = {"image"})
    Optional<ParticipantImage> findFirstByParticipantIdAndPrimaryIsTrueOrderByIdAsc(Long participantId);

    @EntityGraph(attributePaths = {"image"})
    List<ParticipantImage> findAllByParticipantIdOrderByPrimaryDescIdAsc(Long participantId);

    void deleteByParticipantId(Long participantId);
}

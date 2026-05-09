package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.EventParticipant;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EventParticipantRepository extends JpaRepository<EventParticipant, Long> {

    @EntityGraph(attributePaths = {"participant", "event"})
    List<EventParticipant> findAllByEventIdOrderByIdAsc(Long eventId);

    @EntityGraph(attributePaths = {"participant", "event"})
    List<EventParticipant> findAllByParticipantIdOrderByIdAsc(Long participantId);

    void deleteByEventId(Long eventId);

    void deleteByParticipantId(Long participantId);
}

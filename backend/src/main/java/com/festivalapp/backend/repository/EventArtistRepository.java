package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.EventArtist;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EventArtistRepository extends JpaRepository<EventArtist, Long> {

    @EntityGraph(attributePaths = {"artist", "event"})
    List<EventArtist> findAllByEventIdOrderByDisplayOrderAscIdAsc(Long eventId);

    @EntityGraph(attributePaths = {"artist", "event"})
    List<EventArtist> findAllByArtistIdOrderByDisplayOrderAscIdAsc(Long artistId);

    void deleteByEventId(Long eventId);
}

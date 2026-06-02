package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.TicketType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TicketTypeRepository extends JpaRepository<TicketType, Long> {

    List<TicketType> findAllBySessionIdOrderByIdAsc(Long sessionId);

    List<TicketType> findAllBySessionIdInAndActiveIsTrueOrderBySessionIdAscIdAsc(List<Long> sessionIds);

    Optional<TicketType> findFirstBySessionIdAndActiveIsTrueOrderByIdAsc(Long sessionId);
}

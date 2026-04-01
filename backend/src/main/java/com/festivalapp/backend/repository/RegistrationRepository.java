package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.Registration;
import com.festivalapp.backend.entity.RegistrationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface RegistrationRepository extends JpaRepository<Registration, Long> {

    boolean existsByQrToken(String qrToken);

    boolean existsByUserIdAndSessionIdAndStatusIn(Long userId, Long sessionId, Collection<RegistrationStatus> statuses);

    @Query("""
        select coalesce(sum(r.participantsCount), 0) from Registration r
        where r.session.id = :sessionId
          and r.status in :statuses
        """)
    Integer sumParticipantsBySessionIdAndStatuses(@Param("sessionId") Long sessionId,
                                                  @Param("statuses") Collection<RegistrationStatus> statuses);

    @Query("""
        select r.session.id, coalesce(sum(r.participantsCount), 0) from Registration r
        where r.session.id in :sessionIds
          and r.status in :statuses
        group by r.session.id
        """)
    List<Object[]> sumParticipantsBySessionIdsAndStatuses(@Param("sessionIds") Collection<Long> sessionIds,
                                                           @Param("statuses") Collection<RegistrationStatus> statuses);

    @Query("""
        select r from Registration r
        join fetch r.session s
        join fetch s.event e
        join fetch s.venue v
        join fetch v.city c
        where r.user.id = :userId
        order by r.createdAt desc
        """)
    List<Registration> findAllByUserIdWithDetails(@Param("userId") Long userId);

    @Query("""
        select r from Registration r
        join fetch r.user u
        join fetch r.session s
        join fetch s.event e
        where s.id = :sessionId
        order by r.createdAt desc
        """)
    List<Registration> findAllBySessionIdWithUser(@Param("sessionId") Long sessionId);

    long countBySessionIdAndStatusIn(Long sessionId, Collection<RegistrationStatus> statuses);
}

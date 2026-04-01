package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.List;

public interface UserRepository extends JpaRepository<User, Long> {

    boolean existsByLogin(String login);

    boolean existsByEmail(String email);

    Optional<User> findByLogin(String login);

    Optional<User> findByEmail(String email);

    @Query("""
        select distinct u from User u
        left join fetch u.userRoles ur
        left join fetch ur.role
        where u.login = :identifier or u.email = :identifier
        """)
    Optional<User> findByLoginOrEmailWithRoles(@Param("identifier") String identifier);

    @Query("""
        select distinct u from User u
        left join fetch u.userRoles ur
        left join fetch ur.role
        order by u.id
        """)
    List<User> findAllWithRoles();

    @Query("""
        select distinct u from User u
        left join fetch u.userRoles ur
        left join fetch ur.role
        where u.id = :id
        """)
    Optional<User> findByIdWithRoles(@Param("id") Long id);
}

package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    boolean existsByLogin(String login);

    boolean existsByLoginAndIdNot(String login, Long id);

    boolean existsByEmail(String email);

    boolean existsByEmailAndIdNot(String email, Long id);

    boolean existsByPendingEmail(String pendingEmail);

    boolean existsByPendingEmailAndIdNot(String pendingEmail, Long id);

    boolean existsByPhone(String phone);

    boolean existsByPhoneAndIdNot(String phone, Long id);

    Optional<User> findByLogin(String login);

    Optional<User> findByEmail(String email);

    @EntityGraph(attributePaths = {"userRoles", "userRoles.role", "city"})
    @Query("select u from User u where (u.login = :identifier or u.email = :identifier) and u.deletedAt is null")
    Optional<User> findByLoginOrEmailWithRoles(@Param("identifier") String identifier);

    @EntityGraph(attributePaths = {"userRoles", "userRoles.role", "city"})
    @Query("select u from User u where u.deletedAt is null order by u.id")
    List<User> findAllWithRoles();

    @EntityGraph(attributePaths = {"userRoles", "userRoles.role", "city"})
    @Query("select u from User u where u.id = :id and u.deletedAt is null")
    Optional<User> findByIdWithRoles(@Param("id") Long id);
}

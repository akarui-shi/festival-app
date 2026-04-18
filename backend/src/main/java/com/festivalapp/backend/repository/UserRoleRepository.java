package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserRoleRepository extends JpaRepository<UserRole, Long> {

    List<UserRole> findAllByUserId(Long userId);

    void deleteByUserId(Long userId);

    boolean existsByUserIdAndRoleId(Long userId, Long roleId);
}

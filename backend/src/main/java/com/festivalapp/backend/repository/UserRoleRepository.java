package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.UserRole;
import com.festivalapp.backend.entity.UserRoleId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRoleRepository extends JpaRepository<UserRole, UserRoleId> {
}

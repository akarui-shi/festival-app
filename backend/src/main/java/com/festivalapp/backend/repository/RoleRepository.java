package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.Role;
import com.festivalapp.backend.entity.RoleName;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RoleRepository extends JpaRepository<Role, Long> {

    Optional<Role> findByName(String name);

    default Optional<Role> findByName(RoleName roleName) {
        return findByName(roleName.toDbName());
    }
}

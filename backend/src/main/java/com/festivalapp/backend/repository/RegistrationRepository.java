package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.Registration;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RegistrationRepository extends JpaRepository<Registration, Long> {
}

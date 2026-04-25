package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.UserInterest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface UserInterestRepository extends JpaRepository<UserInterest, UserInterest.UserInterestId> {

    List<UserInterest> findAllByUserId(Long userId);

    @Modifying
    @Query("DELETE FROM UserInterest ui WHERE ui.userId = :userId")
    void deleteAllByUserId(@Param("userId") Long userId);
}

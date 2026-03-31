package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.UserResponse;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.exception.ResourceNotFoundException;
import com.festivalapp.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(String username) {
        User user = userRepository.findByLogin(username)
            .or(() -> userRepository.findByEmail(username))
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        return UserResponse.builder()
            .id(user.getId())
            .login(user.getLogin())
            .email(user.getEmail())
            .phone(user.getPhone())
            .firstName(user.getFirstName())
            .lastName(user.getLastName())
            .avatarUrl(user.getAvatarUrl())
            .status(user.getStatus())
            .build();
    }
}

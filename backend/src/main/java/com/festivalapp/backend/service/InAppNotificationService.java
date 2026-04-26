package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.NotificationResponse;
import com.festivalapp.backend.entity.Notification;
import com.festivalapp.backend.repository.NotificationRepository;
import com.festivalapp.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class InAppNotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public void create(Long userId, String type, String title, String body, String link) {
        userRepository.findById(userId).ifPresent(user ->
            notificationRepository.save(Notification.builder()
                .user(user)
                .type(type)
                .title(title)
                .body(body)
                .link(link)
                .read(false)
                .createdAt(OffsetDateTime.now())
                .build())
        );
    }

    public void createByIdentifier(String identifier, String type, String title, String body, String link) {
        userRepository.findByLoginOrEmailWithRoles(identifier)
            .ifPresent(user -> create(user.getId(), type, title, body, link));
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> getForUser(String identifier) {
        var user = userRepository.findByLoginOrEmailWithRoles(identifier)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return notificationRepository.findAllByUserIdOrderByCreatedAtDesc(user.getId())
            .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Long> getUnreadCount(String identifier) {
        var user = userRepository.findByLoginOrEmailWithRoles(identifier)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return Map.of("count", notificationRepository.countByUserIdAndReadFalse(user.getId()));
    }

    @Transactional
    public void markRead(Long notificationId, String identifier) {
        var user = userRepository.findByLoginOrEmailWithRoles(identifier)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        notificationRepository.findById(notificationId).ifPresent(n -> {
            if (n.getUser().getId().equals(user.getId())) {
                n.setRead(true);
                notificationRepository.save(n);
            }
        });
    }

    @Transactional
    public void markAllRead(String identifier) {
        var user = userRepository.findByLoginOrEmailWithRoles(identifier)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        notificationRepository.markAllReadByUserId(user.getId());
    }

    private NotificationResponse toResponse(Notification n) {
        return NotificationResponse.builder()
            .id(n.getId())
            .type(n.getType())
            .title(n.getTitle())
            .body(n.getBody())
            .link(n.getLink())
            .read(n.isRead())
            .createdAt(n.getCreatedAt())
            .build();
    }
}

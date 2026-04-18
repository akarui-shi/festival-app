package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.AdminActionResponse;
import com.festivalapp.backend.entity.AdministrativeAction;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.repository.AdministrativeActionRepository;
import com.festivalapp.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminAuditService {

    private final AdministrativeActionRepository administrativeActionRepository;
    private final UserRepository userRepository;

    @Transactional
    public void log(String adminIdentifier,
                    String actionType,
                    String entityType,
                    Long entityId,
                    String details) {
        User admin = null;
        if (adminIdentifier != null) {
            admin = userRepository.findByLoginOrEmailWithRoles(adminIdentifier).orElse(null);
        }

        administrativeActionRepository.save(AdministrativeAction.builder()
            .admin(admin)
            .actionType(actionType)
            .entityType(entityType)
            .entityId(entityId)
            .details(details)
            .createdAt(OffsetDateTime.now())
            .build());
    }

    @Transactional(readOnly = true)
    public List<AdminActionResponse> getRecentActions() {
        return administrativeActionRepository.findTop200ByOrderByCreatedAtDesc().stream()
            .map(action -> AdminActionResponse.builder()
                .id(action.getId())
                .adminId(action.getAdmin() == null ? null : action.getAdmin().getId())
                .adminName(action.getAdmin() == null ? null : (action.getAdmin().getFirstName() + " " + action.getAdmin().getLastName()).trim())
                .actionType(action.getActionType())
                .entityType(action.getEntityType())
                .entityId(action.getEntityId())
                .details(action.getDetails())
                .createdAt(action.getCreatedAt() == null ? null : action.getCreatedAt().toLocalDateTime())
                .build())
            .toList();
    }
}

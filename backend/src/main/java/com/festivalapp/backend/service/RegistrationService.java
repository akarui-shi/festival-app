package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.MyRegistrationResponse;
import com.festivalapp.backend.dto.RegistrationCreateRequest;
import com.festivalapp.backend.dto.RegistrationResponse;
import com.festivalapp.backend.entity.Registration;
import com.festivalapp.backend.entity.RegistrationStatus;
import com.festivalapp.backend.entity.Session;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.exception.ResourceNotFoundException;
import com.festivalapp.backend.repository.RegistrationRepository;
import com.festivalapp.backend.repository.SessionRepository;
import com.festivalapp.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RegistrationService {

    private static final Set<RegistrationStatus> ACTIVE_REGISTRATION_STATUSES =
        Set.of(RegistrationStatus.CREATED, RegistrationStatus.CONFIRMED);

    private final RegistrationRepository registrationRepository;
    private final SessionRepository sessionRepository;
    private final UserRepository userRepository;

    @Transactional
    public RegistrationResponse create(RegistrationCreateRequest request, String actorIdentifier) {
        User user = loadActor(actorIdentifier);

        Session session = sessionRepository.findDetailedById(request.getSessionId())
            .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + request.getSessionId()));

        boolean alreadyRegistered = registrationRepository.existsByUserIdAndSessionIdAndStatusIn(
            user.getId(),
            session.getId(),
            ACTIVE_REGISTRATION_STATUSES
        );
        if (alreadyRegistered) {
            throw new BadRequestException("User already has an active registration for this session");
        }

        int totalCapacity = safeCapacity(session);
        int reservedSeats = getReservedSeats(session.getId());
        int availableSeats = Math.max(totalCapacity - reservedSeats, 0);

        if (request.getQuantity() > availableSeats) {
            throw new BadRequestException("Not enough seats");
        }

        Registration registration = Registration.builder()
            .user(user)
            .session(session)
            .quantity(request.getQuantity())
            .status(RegistrationStatus.CREATED)
            .qrToken(generateUniqueQrToken())
            .build();

        Registration saved;
        try {
            saved = registrationRepository.save(registration);
        } catch (DataIntegrityViolationException ex) {
            throw new BadRequestException(resolveRegistrationIntegrityMessage(ex));
        }
        return toRegistrationResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<MyRegistrationResponse> getMyRegistrations(String actorIdentifier) {
        User user = loadActor(actorIdentifier);

        return registrationRepository.findAllByUserIdWithDetails(user.getId()).stream()
            .map(this::toMyRegistrationResponse)
            .toList();
    }

    @Transactional
    public Map<String, Object> cancelRegistration(Long id, String actorIdentifier) {
        User user = loadActor(actorIdentifier);

        Registration registration = registrationRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Registration not found: " + id));

        if (!registration.getUser().getId().equals(user.getId())) {
            throw new AccessDeniedException("You can cancel only your registrations");
        }

        if (registration.getStatus() == RegistrationStatus.CANCELLED) {
            return Map.of(
                "message", "Registration already cancelled",
                "registrationId", registration.getId(),
                "status", registration.getStatus()
            );
        }

        registration.setStatus(RegistrationStatus.CANCELLED);
        registrationRepository.save(registration);

        return Map.of(
            "message", "Registration cancelled successfully",
            "registrationId", registration.getId(),
            "status", registration.getStatus()
        );
    }

    private User loadActor(String actorIdentifier) {
        return userRepository.findByLoginOrEmailWithRoles(actorIdentifier)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private String generateUniqueQrToken() {
        // UUID token is sufficient as a unique QR payload for current scope.
        String token;
        do {
            token = UUID.randomUUID().toString();
        } while (registrationRepository.existsByQrToken(token));
        return token;
    }

    private int getReservedSeats(Long sessionId) {
        Integer reservedSeats = registrationRepository.sumParticipantsBySessionIdAndStatuses(
            sessionId,
            ACTIVE_REGISTRATION_STATUSES
        );
        return reservedSeats == null ? 0 : reservedSeats;
    }

    private int safeCapacity(Session session) {
        if (session.getVenue() == null || session.getVenue().getCapacity() == null) {
            return 0;
        }
        return session.getVenue().getCapacity();
    }

    private RegistrationResponse toRegistrationResponse(Registration registration) {
        Session session = registration.getSession();

        return RegistrationResponse.builder()
            .registrationId(registration.getId())
            .sessionId(session.getId())
            .eventTitle(session.getEvent() != null ? session.getEvent().getTitle() : null)
            .sessionTitle(session.getTitle())
            .venueName(session.getVenue() != null ? session.getVenue().getName() : null)
            .startAt(session.getStartTime())
            .quantity(registration.getQuantity())
            .status(registration.getStatus())
            .qrToken(registration.getQrToken())
            .createdAt(registration.getCreatedAt())
            .build();
    }

    private MyRegistrationResponse toMyRegistrationResponse(Registration registration) {
        Session session = registration.getSession();

        return MyRegistrationResponse.builder()
            .registrationId(registration.getId())
            .sessionId(session.getId())
            .eventTitle(session.getEvent() != null ? session.getEvent().getTitle() : null)
            .sessionTitle(session.getTitle())
            .venueName(session.getVenue() != null ? session.getVenue().getName() : null)
            .startAt(session.getStartTime())
            .quantity(registration.getQuantity())
            .status(registration.getStatus())
            .qrToken(registration.getQrToken())
            .createdAt(registration.getCreatedAt())
            .build();
    }

    private String resolveRegistrationIntegrityMessage(DataIntegrityViolationException ex) {
        String rawMessage = ex.getMostSpecificCause() != null
            ? ex.getMostSpecificCause().getMessage()
            : ex.getMessage();
        String normalized = rawMessage == null ? "" : rawMessage.toLowerCase();

        if (normalized.contains("registrations_status_check")) {
            return "Не удалось создать регистрацию: недопустимый статус регистрации";
        }
        if (normalized.contains("qr_token")) {
            return "Не удалось создать регистрацию: конфликт QR-токена";
        }
        if (normalized.contains("session_id")) {
            return "Не удалось создать регистрацию: сеанс не найден";
        }
        if (normalized.contains("user_id")) {
            return "Не удалось создать регистрацию: пользователь не найден";
        }
        return "Не удалось создать регистрацию";
    }
}

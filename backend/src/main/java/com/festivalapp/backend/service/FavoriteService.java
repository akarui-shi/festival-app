package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.FavoriteCreateRequest;
import com.festivalapp.backend.dto.FavoriteResponse;
import com.festivalapp.backend.entity.Event;
import com.festivalapp.backend.entity.Favorite;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.exception.ResourceNotFoundException;
import com.festivalapp.backend.repository.EventImageRepository;
import com.festivalapp.backend.repository.EventRepository;
import com.festivalapp.backend.repository.FavoriteRepository;
import com.festivalapp.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class FavoriteService {

    private final FavoriteRepository favoriteRepository;
    private final UserRepository userRepository;
    private final EventRepository eventRepository;
    private final EventImageRepository eventImageRepository;

    @Transactional
    public FavoriteResponse create(FavoriteCreateRequest request, String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        Event event = eventRepository.findByIdAndDeletedAtIsNull(request.getEventId())
            .orElseThrow(() -> new ResourceNotFoundException("Event not found"));

        if (favoriteRepository.existsByUserIdAndEventId(actor.getId(), event.getId())) {
            throw new BadRequestException("Мероприятие уже в избранном");
        }

        favoriteRepository.save(Favorite.builder()
            .user(actor)
            .event(event)
            .createdAt(OffsetDateTime.now())
            .build());

        return toResponse(event);
    }

    @Transactional(readOnly = true)
    public List<FavoriteResponse> getMyFavorites(String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        return favoriteRepository.findAllByUserIdOrderByCreatedAtDesc(actor.getId()).stream()
            .map(Favorite::getEvent)
            .map(this::toResponse)
            .toList();
    }

    @Transactional
    public Map<String, Object> delete(Long eventId, String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        if (!favoriteRepository.existsByUserIdAndEventId(actor.getId(), eventId)) {
            throw new ResourceNotFoundException("Favorite not found");
        }
        favoriteRepository.deleteByUserIdAndEventId(actor.getId(), eventId);
        return Map.of("success", true);
    }

    private FavoriteResponse toResponse(Event event) {
        return FavoriteResponse.builder()
            .eventId(event.getId())
            .title(event.getTitle())
            .shortDescription(event.getShortDescription())
            .coverImageId(resolveCoverImageId(event.getId()))
            .ageRating(event.getAgeRating())
            .status(DomainStatusMapper.toEventStatus(event.getStatus()))
            .build();
    }

    private Long resolveCoverImageId(Long eventId) {
        if (eventId == null) {
            return null;
        }
        return eventImageRepository.findFirstByEventIdAndPrimaryIsTrueOrderBySortOrderAscIdAsc(eventId)
            .map(link -> link.getImage() == null ? null : link.getImage().getId())
            .orElse(null);
    }

    private User resolveActor(String actorIdentifier) {
        return userRepository.findByLoginOrEmailWithRoles(actorIdentifier)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}

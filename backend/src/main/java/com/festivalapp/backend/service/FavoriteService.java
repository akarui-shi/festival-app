package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.FavoriteCreateRequest;
import com.festivalapp.backend.dto.FavoriteResponse;
import com.festivalapp.backend.entity.Event;
import com.festivalapp.backend.entity.Favorite;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.exception.ResourceNotFoundException;
import com.festivalapp.backend.repository.EventRepository;
import com.festivalapp.backend.repository.FavoriteRepository;
import com.festivalapp.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class FavoriteService {

    private final FavoriteRepository favoriteRepository;
    private final EventRepository eventRepository;
    private final UserRepository userRepository;

    @Transactional
    public FavoriteResponse create(FavoriteCreateRequest request, String actorIdentifier) {
        User user = loadActor(actorIdentifier);

        Event event = eventRepository.findById(request.getEventId())
            .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + request.getEventId()));

        if (favoriteRepository.existsByUserIdAndEventId(user.getId(), event.getId())) {
            throw new BadRequestException("Duplicate favorite: event already in favorites");
        }

        Favorite favorite = favoriteRepository.save(Favorite.builder()
            .user(user)
            .event(event)
            .build());

        return toResponse(favorite.getEvent());
    }

    @Transactional(readOnly = true)
    public List<FavoriteResponse> getMyFavorites(String actorIdentifier) {
        User user = loadActor(actorIdentifier);

        return favoriteRepository.findByUserIdOrderByIdDesc(user.getId()).stream()
            .map(favorite -> toResponse(favorite.getEvent()))
            .toList();
    }

    @Transactional
    public Map<String, Object> delete(Long eventId, String actorIdentifier) {
        User user = loadActor(actorIdentifier);

        Favorite favorite = favoriteRepository.findByUserIdAndEventId(user.getId(), eventId)
            .orElseThrow(() -> new ResourceNotFoundException("Favorite not found for event: " + eventId));

        favoriteRepository.delete(favorite);

        return Map.of(
            "message", "Favorite removed successfully",
            "eventId", eventId
        );
    }

    private User loadActor(String actorIdentifier) {
        return userRepository.findByLoginOrEmailWithRoles(actorIdentifier)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private FavoriteResponse toResponse(Event event) {
        return FavoriteResponse.builder()
            .eventId(event.getId())
            .title(event.getTitle())
            .shortDescription(event.getShortDescription())
            .coverUrl(event.getCoverUrl())
            .ageRating(event.getAgeRating())
            .status(event.getStatus())
            .build();
    }
}

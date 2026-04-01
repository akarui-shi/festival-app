package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.OrganizerVenueCreateRequest;
import com.festivalapp.backend.dto.VenueResponse;
import com.festivalapp.backend.entity.City;
import com.festivalapp.backend.entity.RoleName;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.entity.Venue;
import com.festivalapp.backend.exception.ResourceNotFoundException;
import com.festivalapp.backend.repository.CityRepository;
import com.festivalapp.backend.repository.UserRepository;
import com.festivalapp.backend.repository.VenueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class OrganizerVenueService {

    private final UserRepository userRepository;
    private final CityRepository cityRepository;
    private final VenueRepository venueRepository;

    @Transactional
    public VenueResponse createVenue(OrganizerVenueCreateRequest request, String actorIdentifier) {
        User actor = userRepository.findByLoginOrEmailWithRoles(actorIdentifier)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!hasRole(actor, RoleName.ROLE_ORGANIZER) && !hasRole(actor, RoleName.ROLE_ADMIN)) {
            throw new AccessDeniedException("Only organizer or admin can create venues");
        }

        City city = cityRepository.findById(request.getCityId())
            .orElseThrow(() -> new ResourceNotFoundException("City not found: " + request.getCityId()));

        Venue saved = venueRepository.save(Venue.builder()
            .name(request.getName().trim())
            .address(request.getAddress().trim())
            .contacts(normalizeOptional(request.getContacts()))
            .latitude(request.getLatitude())
            .longitude(request.getLongitude())
            .capacity(request.getCapacity())
            .city(city)
            .build());

        return toVenueResponse(saved);
    }

    private boolean hasRole(User user, RoleName roleName) {
        return user.getUserRoles().stream()
            .anyMatch(userRole -> userRole.getRole().getName() == roleName);
    }

    private String normalizeOptional(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }

    private VenueResponse toVenueResponse(Venue venue) {
        return VenueResponse.builder()
            .id(venue.getId())
            .name(venue.getName())
            .address(venue.getAddress())
            .contacts(venue.getContacts())
            .latitude(venue.getLatitude())
            .longitude(venue.getLongitude())
            .capacity(venue.getCapacity())
            .cityId(venue.getCity() != null ? venue.getCity().getId() : null)
            .cityName(venue.getCity() != null ? venue.getCity().getName() : null)
            .build();
    }
}

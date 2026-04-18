package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.ArtistDetailsResponse;
import com.festivalapp.backend.dto.ArtistSummaryResponse;
import com.festivalapp.backend.dto.ArtistUpsertRequest;
import com.festivalapp.backend.dto.EventShortResponse;
import com.festivalapp.backend.entity.Artist;
import com.festivalapp.backend.entity.Event;
import com.festivalapp.backend.entity.EventArtist;
import com.festivalapp.backend.entity.EventStatus;
import com.festivalapp.backend.entity.RoleName;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.exception.ResourceNotFoundException;
import com.festivalapp.backend.repository.ArtistRepository;
import com.festivalapp.backend.repository.EventArtistRepository;
import com.festivalapp.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.OffsetDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ArtistService {

    private final ArtistRepository artistRepository;
    private final EventArtistRepository eventArtistRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<ArtistSummaryResponse> getPublicList(String q) {
        List<Artist> artists = StringUtils.hasText(q)
            ? artistRepository.findAllByNameContainingIgnoreCaseAndDeletedAtIsNullOrderByNameAsc(q.trim())
            : artistRepository.findAllByDeletedAtIsNullOrderByNameAsc();

        return artists.stream().map(this::toSummary).toList();
    }

    @Transactional(readOnly = true)
    public ArtistDetailsResponse getPublicById(Long id) {
        Artist artist = artistRepository.findByIdAndDeletedAtIsNull(id)
            .orElseThrow(() -> new ResourceNotFoundException("Artist not found"));

        List<EventShortResponse> events = eventArtistRepository.findAllByArtistIdOrderByDisplayOrderAscIdAsc(id).stream()
            .map(EventArtist::getEvent)
            .filter(event -> event != null && DomainStatusMapper.toEventStatus(event.getStatus()) == EventStatus.PUBLISHED)
            .distinct()
            .map(this::toEventShort)
            .toList();

        return ArtistDetailsResponse.builder()
            .id(artist.getId())
            .name(artist.getName())
            .stageName(artist.getStageName())
            .description(artist.getDescription())
            .genre(artist.getGenre())
            .events(events)
            .build();
    }

    @Transactional
    public ArtistSummaryResponse create(ArtistUpsertRequest request, String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        assertCanManage(actor);

        Artist artist = artistRepository.save(Artist.builder()
            .name(normalizeRequired(request.getName(), "Artist name is required"))
            .stageName(normalize(request.getStageName()))
            .description(normalize(request.getDescription()))
            .genre(normalize(request.getGenre()))
            .moderationStatus("на_рассмотрении")
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build());

        return toSummary(artist);
    }

    @Transactional
    public ArtistSummaryResponse update(Long id, ArtistUpsertRequest request, String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        assertCanManage(actor);

        Artist artist = artistRepository.findByIdAndDeletedAtIsNull(id)
            .orElseThrow(() -> new ResourceNotFoundException("Artist not found"));

        if (StringUtils.hasText(request.getName())) {
            artist.setName(request.getName().trim());
        }
        if (request.getStageName() != null) {
            artist.setStageName(normalize(request.getStageName()));
        }
        if (request.getDescription() != null) {
            artist.setDescription(normalize(request.getDescription()));
        }
        if (request.getGenre() != null) {
            artist.setGenre(normalize(request.getGenre()));
        }
        artist.setUpdatedAt(OffsetDateTime.now());

        return toSummary(artistRepository.save(artist));
    }

    @Transactional
    public List<Artist> resolveArtists(List<String> newArtistNames, List<Long> artistIds) {
        List<Artist> resolved = artistIds == null || artistIds.isEmpty()
            ? new java.util.ArrayList<>()
            : new java.util.ArrayList<>(artistRepository.findAllById(artistIds));

        if (newArtistNames != null) {
            for (String rawName : newArtistNames) {
                if (!StringUtils.hasText(rawName)) {
                    continue;
                }
                String name = rawName.trim();
                Artist artist = artistRepository.save(Artist.builder()
                    .name(name)
                    .moderationStatus("на_рассмотрении")
                    .createdAt(OffsetDateTime.now())
                    .updatedAt(OffsetDateTime.now())
                    .build());
                resolved.add(artist);
            }
        }

        return resolved;
    }

    private EventShortResponse toEventShort(Event event) {
        return EventShortResponse.builder()
            .id(event.getId())
            .title(event.getTitle())
            .shortDescription(event.getShortDescription())
            .status(DomainStatusMapper.toEventStatus(event.getStatus()))
            .organizationId(event.getOrganization() == null ? null : event.getOrganization().getId())
            .organizationName(event.getOrganization() == null ? null : event.getOrganization().getName())
            .cityId(event.getCity() == null ? null : event.getCity().getId())
            .cityName(event.getCity() == null ? null : event.getCity().getName())
            .createdAt(event.getCreatedAt() == null ? null : event.getCreatedAt().toLocalDateTime())
            .build();
    }

    private ArtistSummaryResponse toSummary(Artist artist) {
        return ArtistSummaryResponse.builder()
            .id(artist.getId())
            .name(artist.getName())
            .stageName(artist.getStageName())
            .description(artist.getDescription())
            .genre(artist.getGenre())
            .build();
    }

    private User resolveActor(String actorIdentifier) {
        return userRepository.findByLoginOrEmailWithRoles(actorIdentifier)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private void assertCanManage(User actor) {
        boolean canManage = actor.getUserRoles().stream().anyMatch(userRole -> {
            RoleName roleName = userRole.getRole().toRoleName();
            return roleName == RoleName.ROLE_ORGANIZER || roleName == RoleName.ROLE_ADMIN;
        });

        if (!canManage) {
            throw new BadRequestException("Недостаточно прав");
        }
    }

    private String normalizeRequired(String value, String message) {
        if (!StringUtils.hasText(value)) {
            throw new BadRequestException(message);
        }
        return value.trim();
    }

    private String normalize(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }
}

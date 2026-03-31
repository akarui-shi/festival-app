package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.EventCreateRequest;
import com.festivalapp.backend.dto.EventResponse;
import com.festivalapp.backend.entity.Event;
import com.festivalapp.backend.entity.EventStatus;
import com.festivalapp.backend.entity.Organizer;
import com.festivalapp.backend.exception.ResourceNotFoundException;
import com.festivalapp.backend.repository.EventRepository;
import com.festivalapp.backend.repository.OrganizerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EventService {

    private final EventRepository eventRepository;
    private final OrganizerRepository organizerRepository;

    @Transactional(readOnly = true)
    public List<EventResponse> getAll() {
        return eventRepository.findAll().stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public EventResponse getById(Long id) {
        Event event = eventRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + id));
        return toResponse(event);
    }

    @Transactional
    public EventResponse create(EventCreateRequest request) {
        Organizer organizer = organizerRepository.findById(request.getOrganizerId())
            .orElseThrow(() -> new ResourceNotFoundException("Organizer not found: " + request.getOrganizerId()));

        Event event = Event.builder()
            .title(request.getTitle())
            .shortDescription(request.getShortDescription())
            .fullDescription(request.getFullDescription())
            .ageRating(request.getAgeRating())
            .createdAt(LocalDateTime.now())
            .status(request.getStatus() == null ? EventStatus.DRAFT : request.getStatus())
            .organizer(organizer)
            .build();

        return toResponse(eventRepository.save(event));
    }

    @Transactional
    public EventResponse update(Long id, EventCreateRequest request) {
        Event event = eventRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + id));

        Organizer organizer = organizerRepository.findById(request.getOrganizerId())
            .orElseThrow(() -> new ResourceNotFoundException("Organizer not found: " + request.getOrganizerId()));

        event.setTitle(request.getTitle());
        event.setShortDescription(request.getShortDescription());
        event.setFullDescription(request.getFullDescription());
        event.setAgeRating(request.getAgeRating());
        event.setOrganizer(organizer);
        if (request.getStatus() != null) {
            event.setStatus(request.getStatus());
        }

        return toResponse(eventRepository.save(event));
    }

    @Transactional
    public void delete(Long id) {
        if (!eventRepository.existsById(id)) {
            throw new ResourceNotFoundException("Event not found: " + id);
        }
        eventRepository.deleteById(id);
    }

    private EventResponse toResponse(Event event) {
        return EventResponse.builder()
            .id(event.getId())
            .title(event.getTitle())
            .shortDescription(event.getShortDescription())
            .fullDescription(event.getFullDescription())
            .ageRating(event.getAgeRating())
            .status(event.getStatus())
            .createdAt(event.getCreatedAt())
            .organizerId(event.getOrganizer() != null ? event.getOrganizer().getId() : null)
            .build();
    }
}

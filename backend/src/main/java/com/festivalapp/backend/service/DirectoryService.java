package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.CategoryResponse;
import com.festivalapp.backend.dto.CityResponse;
import com.festivalapp.backend.dto.VenueResponse;
import com.festivalapp.backend.entity.Category;
import com.festivalapp.backend.entity.City;
import com.festivalapp.backend.entity.Venue;
import com.festivalapp.backend.repository.CategoryRepository;
import com.festivalapp.backend.repository.CityRepository;
import com.festivalapp.backend.repository.VenueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DirectoryService {

    private final CategoryRepository categoryRepository;
    private final VenueRepository venueRepository;
    private final CityRepository cityRepository;

    @Transactional(readOnly = true)
    public List<CategoryResponse> getCategories() {
        return categoryRepository.findAllByOrderByNameAsc().stream()
            .map(this::toCategoryResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<VenueResponse> getVenues() {
        return venueRepository.findAllByOrderByNameAsc().stream()
            .map(this::toVenueResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<CityResponse> getCities() {
        return cityRepository.findAllByOrderByNameAsc().stream()
            .map(this::toCityResponse)
            .toList();
    }

    private CategoryResponse toCategoryResponse(Category category) {
        return CategoryResponse.builder()
            .id(category.getId())
            .name(category.getName())
            .build();
    }

    private VenueResponse toVenueResponse(Venue venue) {
        return VenueResponse.builder()
            .id(venue.getId())
            .name(venue.getName())
            .address(venue.getAddress())
            .capacity(venue.getCapacity())
            .cityId(venue.getCity() != null ? venue.getCity().getId() : null)
            .cityName(venue.getCity() != null ? venue.getCity().getName() : null)
            .build();
    }

    private CityResponse toCityResponse(City city) {
        return CityResponse.builder()
            .id(city.getId())
            .name(city.getName())
            .region(city.getRegion())
            .country(city.getCountry())
            .build();
    }
}

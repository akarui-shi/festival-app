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
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DirectoryService {

    private final CategoryRepository categoryRepository;
    private final CityRepository cityRepository;
    private final VenueRepository venueRepository;

    @Transactional(readOnly = true)
    public List<CategoryResponse> getCategories() {
        return categoryRepository.findAll().stream()
            .sorted((a, b) -> a.getName().compareToIgnoreCase(b.getName()))
            .map(this::toCategoryResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<VenueResponse> getVenues() {
        return venueRepository.findAllByOrderByNameAsc().stream()
            .filter(Venue::isActive)
            .map(this::toVenueResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<CityResponse> getCities(String query, Integer limit) {
        List<City> all = StringUtils.hasText(query)
            ? cityRepository.search(query.trim())
            : cityRepository.findAllByOrderByNameAsc();

        int safeLimit = limit == null || limit <= 0 ? 50 : Math.min(limit, 200);

        return all.stream()
            .limit(safeLimit)
            .map(this::toCityResponse)
            .toList();
    }

    private CategoryResponse toCategoryResponse(Category category) {
        return CategoryResponse.builder()
            .id(category.getId())
            .name(category.getName())
            .description(category.getDescription())
            .build();
    }

    private CityResponse toCityResponse(City city) {
        return CityResponse.builder()
            .id(city.getId())
            .name(city.getName())
            .region(city.getRegion())
            .country("Россия")
            .build();
    }

    private VenueResponse toVenueResponse(Venue venue) {
        return VenueResponse.builder()
            .id(venue.getId())
            .name(venue.getName())
            .address(venue.getAddress())
            .contacts(null)
            .latitude(venue.getLatitude())
            .longitude(venue.getLongitude())
            .capacity(venue.getCapacity())
            .cityId(venue.getCity() == null ? null : venue.getCity().getId())
            .cityName(venue.getCity() == null ? null : venue.getCity().getName())
            .build();
    }
}

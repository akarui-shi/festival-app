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

import java.util.Comparator;
import java.util.List;
import java.util.Locale;

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
    public List<CityResponse> getCities(String query, Integer limit) {
        List<City> cities;
        if (StringUtils.hasText(query)) {
            int safeLimit = limit == null ? 50 : Math.max(1, Math.min(limit, 200));
            String normalizedQuery = query.trim().toLowerCase(Locale.ROOT);
            cities = cityRepository.findAllByOrderByNameAsc().stream()
                .filter(city -> containsIgnoreCase(city.getName(), normalizedQuery)
                    || containsIgnoreCase(city.getRegion(), normalizedQuery))
                .sorted(citySearchComparator(normalizedQuery))
                .limit(safeLimit)
                .toList();
        } else {
            cities = cityRepository.findAllByOrderByNameAsc();
        }

        return cities.stream()
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

    private boolean containsIgnoreCase(String value, String query) {
        if (!StringUtils.hasText(value) || !StringUtils.hasText(query)) {
            return false;
        }
        return value.toLowerCase(Locale.ROOT).contains(query);
    }

    private Comparator<City> citySearchComparator(String normalizedQuery) {
        return Comparator
            .comparingInt((City city) -> matchPriority(city, normalizedQuery))
            .thenComparing(city -> normalize(city.getName()))
            .thenComparing(city -> normalize(city.getRegion()));
    }

    private int matchPriority(City city, String normalizedQuery) {
        String normalizedName = normalize(city.getName());
        String normalizedRegion = normalize(city.getRegion());

        if (normalizedName.equals(normalizedQuery)) {
            return 0;
        }
        if (normalizedName.startsWith(normalizedQuery)) {
            return 1;
        }
        if (normalizedName.contains(normalizedQuery)) {
            return 2;
        }
        if (normalizedRegion.startsWith(normalizedQuery)) {
            return 3;
        }
        if (normalizedRegion.contains(normalizedQuery)) {
            return 4;
        }
        return 5;
    }

    private String normalize(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }
        return value.trim().toLowerCase(Locale.ROOT);
    }
}

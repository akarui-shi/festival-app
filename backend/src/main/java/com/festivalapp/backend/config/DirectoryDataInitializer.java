package com.festivalapp.backend.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.festivalapp.backend.entity.Category;
import com.festivalapp.backend.entity.City;
import com.festivalapp.backend.entity.Venue;
import com.festivalapp.backend.repository.CategoryRepository;
import com.festivalapp.backend.repository.CityRepository;
import com.festivalapp.backend.repository.VenueRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Component
@Order(2)
@RequiredArgsConstructor
@Slf4j
public class DirectoryDataInitializer implements CommandLineRunner {

    private static final String RUSSIA = "Россия";
    private static final String KOLOMNA_NAME = "Коломна";
    private static final String KOLOMNA_REGION = "Московская область";
    private static final long CITIES_IMPORT_THRESHOLD = 1000;

    private final CategoryRepository categoryRepository;
    private final CityRepository cityRepository;
    private final VenueRepository venueRepository;
    private final ObjectMapper objectMapper;

    @Override
    public void run(String... args) {
        seedCategories();
        seedCitiesAndVenues();
    }

    private void seedCategories() {
        ensureCategory("Музыка", "Музыкальные мероприятия");
        ensureCategory("Театр", "Театральные постановки");
        ensureCategory("Выставка", "Художественные и тематические выставки");
        ensureCategory("Городской праздник", "Праздничные мероприятия для жителей города");
    }

    private Category ensureCategory(String name, String description) {
        return categoryRepository.findByNameIgnoreCase(name)
            .orElseGet(() -> categoryRepository.save(Category.builder()
                .name(name)
                .description(description)
                .build()));
    }

    private void seedCitiesAndVenues() {
        importRussianCitiesFromResourceIfNeeded();
        City kolomna = ensureKolomnaCity();

        seedVenues(kolomna);
    }

    private void importRussianCitiesFromResourceIfNeeded() {
        ClassPathResource resource = new ClassPathResource("data/russian-cities.json");
        if (!resource.exists()) {
            log.warn("Russian cities resource file is missing: data/russian-cities.json");
            return;
        }

        JsonNode root;
        try (InputStream inputStream = resource.getInputStream()) {
            root = objectMapper.readTree(inputStream);
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to import russian cities from resource", ex);
        }

        if (root == null || !root.isArray()) {
            log.warn("Russian cities resource has invalid format");
            return;
        }

        Map<String, String> regionFullNameByShortName = buildRegionFullNameDictionary(root);
        normalizeExistingRussianCitiesRegions(regionFullNameByShortName);

        if (cityRepository.count() >= CITIES_IMPORT_THRESHOLD) {
            return;
        }

        Set<String> existingKeys = new HashSet<>();
        for (City city : cityRepository.findAllByOrderByNameAsc()) {
            existingKeys.add(buildCityKey(city.getName(), city.getRegion(), city.getCountry()));
        }

        List<City> citiesToInsert = new ArrayList<>();
        for (JsonNode node : root) {
            String contentType = node.path("contentType").asText("");
            if (!"city".equalsIgnoreCase(contentType)) {
                continue;
            }

            String name = normalize(node.path("name").asText());
            if (!StringUtils.hasText(name)) {
                continue;
            }

            String region = resolveRegionFullName(node.path("region"));
            String key = buildCityKey(name, region, RUSSIA);
            if (!existingKeys.add(key)) {
                continue;
            }

            citiesToInsert.add(City.builder()
                .name(name)
                .region(StringUtils.hasText(region) ? region : null)
                .country(RUSSIA)
                .build());
        }

        if (!citiesToInsert.isEmpty()) {
            cityRepository.saveAll(citiesToInsert);
            log.info("Imported {} Russian cities into cities table", citiesToInsert.size());
        }
    }

    private Map<String, String> buildRegionFullNameDictionary(JsonNode root) {
        Map<String, String> dictionary = new HashMap<>();

        for (JsonNode node : root) {
            JsonNode regionNode = node.path("region");
            String shortName = normalize(regionNode.path("name").asText());
            if (!StringUtils.hasText(shortName)) {
                continue;
            }

            String fullName = resolveRegionFullName(regionNode);
            if (!StringUtils.hasText(fullName)) {
                continue;
            }

            dictionary.putIfAbsent(shortName.toLowerCase(Locale.ROOT), fullName);
            dictionary.putIfAbsent(fullName.toLowerCase(Locale.ROOT), fullName);
        }

        return dictionary;
    }

    private void normalizeExistingRussianCitiesRegions(Map<String, String> regionFullNameByShortName) {
        if (regionFullNameByShortName.isEmpty()) {
            return;
        }

        List<City> changedCities = new ArrayList<>();
        for (City city : cityRepository.findAllByOrderByNameAsc()) {
            if (!RUSSIA.equalsIgnoreCase(normalize(city.getCountry()))) {
                continue;
            }

            String currentRegion = normalize(city.getRegion());
            if (!StringUtils.hasText(currentRegion)) {
                continue;
            }

            String fullRegion = regionFullNameByShortName.get(currentRegion.toLowerCase(Locale.ROOT));
            if (!StringUtils.hasText(fullRegion) || fullRegion.equals(currentRegion)) {
                continue;
            }

            city.setRegion(fullRegion);
            changedCities.add(city);
        }

        if (!changedCities.isEmpty()) {
            cityRepository.saveAll(changedCities);
            log.info("Normalized regions for {} existing Russian cities to full names", changedCities.size());
        }
    }

    private String resolveRegionFullName(JsonNode regionNode) {
        String fullName = normalize(regionNode.path("fullname").asText());
        if (StringUtils.hasText(fullName)) {
            return fullName;
        }

        String nominative = normalize(regionNode.path("namecase").path("nominative").asText());
        if (StringUtils.hasText(nominative)) {
            return nominative;
        }

        String name = normalize(regionNode.path("name").asText());
        String type = normalize(regionNode.path("type").asText());
        if (StringUtils.hasText(type) && StringUtils.hasText(name)) {
            if (name.toLowerCase(Locale.ROOT).startsWith(type.toLowerCase(Locale.ROOT))) {
                return name;
            }
            return type + " " + name;
        }

        return name;
    }

    private City ensureKolomnaCity() {
        return cityRepository.findFirstByNameIgnoreCaseAndRegionIgnoreCaseAndCountryIgnoreCase(
                KOLOMNA_NAME,
                KOLOMNA_REGION,
                RUSSIA
            )
            .orElseGet(() -> cityRepository.save(City.builder()
                .name(KOLOMNA_NAME)
                .region(KOLOMNA_REGION)
                .country(RUSSIA)
                .build()));
    }

    private void seedVenues(City city) {
        ensureVenue(
            city,
            "Городской парк",
            "ул. Левшина, 15",
            2500,
            new BigDecimal("55.103200"),
            new BigDecimal("38.754800")
        );
        ensureVenue(
            city,
            "Дом культуры",
            "ул. Октябрьской Революции, 324",
            900,
            new BigDecimal("55.100700"),
            new BigDecimal("38.766300")
        );
        ensureVenue(
            city,
            "Центральная площадь",
            "пл. Советская, 1",
            5000,
            new BigDecimal("55.099900"),
            new BigDecimal("38.769500")
        );
    }

    private Venue ensureVenue(City city,
                              String name,
                              String address,
                              Integer capacity,
                              BigDecimal latitude,
                              BigDecimal longitude) {
        Venue venue = venueRepository.findFirstByAddressIgnoreCaseAndCityId(address, city.getId())
            .orElseGet(() -> Venue.builder().city(city).build());

        venue.setName(name);
        venue.setAddress(address);
        venue.setCapacity(capacity);
        venue.setLatitude(latitude);
        venue.setLongitude(longitude);
        venue.setCity(city);

        return venueRepository.save(venue);
    }

    private String buildCityKey(String name, String region, String country) {
        return normalize(name).toLowerCase(Locale.ROOT) + "|"
            + normalize(region).toLowerCase(Locale.ROOT) + "|"
            + normalize(country).toLowerCase(Locale.ROOT);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }
}

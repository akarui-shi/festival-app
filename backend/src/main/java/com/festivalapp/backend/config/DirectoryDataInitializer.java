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
import java.math.BigDecimal;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
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
        if (categoryRepository.count() > 0) {
            return;
        }

        categoryRepository.saveAll(List.of(
            Category.builder().name("Музыка").description("Музыкальные мероприятия").build(),
            Category.builder().name("Театр").description("Театральные постановки").build(),
            Category.builder().name("Выставка").description("Художественные и тематические выставки").build(),
            Category.builder().name("Городской праздник").description("Праздничные мероприятия для жителей города").build()
        ));
    }

    private void seedCitiesAndVenues() {
        importRussianCitiesFromResourceIfNeeded();
        City kolomna = ensureKolomnaCity();

        if (venueRepository.count() > 0) {
            return;
        }

        venueRepository.saveAll(List.of(
            Venue.builder()
                .name("Городской парк")
                .address("ул. Левшина, 15")
                .capacity(2500)
                .latitude(new BigDecimal("55.103200"))
                .longitude(new BigDecimal("38.754800"))
                .city(kolomna)
                .build(),
            Venue.builder()
                .name("Дом культуры")
                .address("ул. Октябрьской Революции, 324")
                .capacity(900)
                .latitude(new BigDecimal("55.100700"))
                .longitude(new BigDecimal("38.766300"))
                .city(kolomna)
                .build(),
            Venue.builder()
                .name("Центральная площадь")
                .address("пл. Советская, 1")
                .capacity(5000)
                .latitude(new BigDecimal("55.099900"))
                .longitude(new BigDecimal("38.769500"))
                .city(kolomna)
                .build()
        ));
    }

    private void importRussianCitiesFromResourceIfNeeded() {
        if (cityRepository.count() >= CITIES_IMPORT_THRESHOLD) {
            return;
        }

        ClassPathResource resource = new ClassPathResource("data/russian-cities.json");
        if (!resource.exists()) {
            log.warn("Russian cities resource file is missing: data/russian-cities.json");
            return;
        }

        Set<String> existingKeys = new HashSet<>();
        for (City city : cityRepository.findAllByOrderByNameAsc()) {
            existingKeys.add(buildCityKey(city.getName(), city.getRegion(), city.getCountry()));
        }

        List<City> citiesToInsert = new ArrayList<>();
        try (InputStream inputStream = resource.getInputStream()) {
            JsonNode root = objectMapper.readTree(inputStream);
            if (root == null || !root.isArray()) {
                log.warn("Russian cities resource has invalid format");
                return;
            }

            for (JsonNode node : root) {
                String contentType = node.path("contentType").asText("");
                if (!"city".equalsIgnoreCase(contentType)) {
                    continue;
                }

                String name = normalize(node.path("name").asText());
                if (!StringUtils.hasText(name)) {
                    continue;
                }

                String region = normalize(node.path("region").path("name").asText());
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
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to import russian cities from resource", ex);
        }

        if (!citiesToInsert.isEmpty()) {
            cityRepository.saveAll(citiesToInsert);
            log.info("Imported {} Russian cities into cities table", citiesToInsert.size());
        }
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

    private String buildCityKey(String name, String region, String country) {
        return normalize(name).toLowerCase(Locale.ROOT) + "|"
            + normalize(region).toLowerCase(Locale.ROOT) + "|"
            + normalize(country).toLowerCase(Locale.ROOT);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }
}

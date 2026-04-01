package com.festivalapp.backend.config;

import com.festivalapp.backend.entity.Category;
import com.festivalapp.backend.entity.City;
import com.festivalapp.backend.entity.Venue;
import com.festivalapp.backend.repository.CategoryRepository;
import com.festivalapp.backend.repository.CityRepository;
import com.festivalapp.backend.repository.VenueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

@Component
@RequiredArgsConstructor
public class DirectoryDataInitializer implements CommandLineRunner {

    private final CategoryRepository categoryRepository;
    private final CityRepository cityRepository;
    private final VenueRepository venueRepository;

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
            Category.builder().name("Лекции").description("Образовательные мероприятия").build()
        ));
    }

    private void seedCitiesAndVenues() {
        if (cityRepository.count() == 0) {
            cityRepository.saveAll(List.of(
                City.builder().name("Москва").region("Москва").country("Россия").build(),
                City.builder().name("Санкт-Петербург").region("СЗФО").country("Россия").build()
            ));
        }

        if (venueRepository.count() > 0) {
            return;
        }

        List<City> cities = cityRepository.findAllByOrderByNameAsc();
        City moscow = cities.stream()
            .filter(city -> "Москва".equalsIgnoreCase(city.getName()))
            .findFirst()
            .orElseGet(() -> cityRepository.save(City.builder()
                .name("Москва")
                .region("Москва")
                .country("Россия")
                .build()));
        City spb = cities.stream()
            .filter(city -> "Санкт-Петербург".equalsIgnoreCase(city.getName()))
            .findFirst()
            .orElseGet(() -> cityRepository.save(City.builder()
                .name("Санкт-Петербург")
                .region("СЗФО")
                .country("Россия")
                .build()));

        venueRepository.saveAll(List.of(
            Venue.builder()
                .name("Центральный парк")
                .address("ул. Парковая, 1")
                .capacity(2000)
                .latitude(new BigDecimal("55.751244"))
                .longitude(new BigDecimal("37.618423"))
                .city(moscow)
                .build(),
            Venue.builder()
                .name("Городской театр")
                .address("Театральный проспект, 10")
                .capacity(800)
                .latitude(new BigDecimal("55.760186"))
                .longitude(new BigDecimal("37.618711"))
                .city(moscow)
                .build(),
            Venue.builder()
                .name("Лофт-пространство Север")
                .address("наб. Невы, 25")
                .capacity(450)
                .latitude(new BigDecimal("59.934280"))
                .longitude(new BigDecimal("30.335099"))
                .city(spb)
                .build()
        ));
    }
}

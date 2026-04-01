package com.festivalapp.backend.config;

import com.festivalapp.backend.entity.Category;
import com.festivalapp.backend.entity.City;
import com.festivalapp.backend.entity.Venue;
import com.festivalapp.backend.repository.CategoryRepository;
import com.festivalapp.backend.repository.CityRepository;
import com.festivalapp.backend.repository.VenueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

@Component
@Order(2)
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
            Category.builder().name("Городской праздник").description("Праздничные мероприятия для жителей города").build()
        ));
    }

    private void seedCitiesAndVenues() {
        if (cityRepository.count() == 0) {
            cityRepository.saveAll(List.of(
                City.builder().name("Коломна").region("Московская область").country("Россия").build()
            ));
        }

        if (venueRepository.count() > 0) {
            return;
        }

        List<City> cities = cityRepository.findAllByOrderByNameAsc();
        City kolomna = cities.stream()
            .filter(city -> "Коломна".equalsIgnoreCase(city.getName()))
            .findFirst()
            .orElseGet(() -> cityRepository.save(City.builder()
                .name("Коломна")
                .region("Московская область")
                .country("Россия")
                .build()));

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
}

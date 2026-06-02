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
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

/**
 * Unit-тесты для {@link DirectoryService} — сервиса справочников (категории, площадки, города).
 * Уровень: unit. Мокируются репозитории. Проверяется фильтрация (только активные записи),
 * сортировка, пагинация (limit), маппинг данных в DTO.
 */
@ExtendWith(MockitoExtension.class)
class DirectoryServiceTest {

    @Mock private CategoryRepository categoryRepository;
    @Mock private CityRepository cityRepository;
    @Mock private VenueRepository venueRepository;

    @InjectMocks
    private DirectoryService directoryService;

    // ─── getCategories ────────────────────────────────────────────────────────

    // findAll() возвращает категории в произвольном порядке, но сервис должен сортировать их
    // по алфавиту перед возвратом. Порядок «Арт» → «Концерт» → «Театр».
    @Test
    void getCategories_returnsAllSortedByName() {
        Category c1 = Category.builder().id(1L).name("Театр").description("Театральные постановки").build();
        Category c2 = Category.builder().id(2L).name("Концерт").description("Живая музыка").build();
        Category c3 = Category.builder().id(3L).name("Арт").description("Искусство").build();
        when(categoryRepository.findAll()).thenReturn(List.of(c1, c2, c3));

        List<CategoryResponse> result = directoryService.getCategories();

        assertThat(result).hasSize(3);
        // Should be sorted alphabetically
        assertThat(result.get(0).getName()).isEqualTo("Арт");
        assertThat(result.get(1).getName()).isEqualTo("Концерт");
        assertThat(result.get(2).getName()).isEqualTo("Театр");
    }

    // Пустой справочник → пустой список (не null, не исключение).
    @Test
    void getCategories_emptyWhenNone() {
        when(categoryRepository.findAll()).thenReturn(List.of());

        assertThat(directoryService.getCategories()).isEmpty();
    }

    // Проверяем, что все поля (id, name, description) корректно маппятся в CategoryResponse.
    @Test
    void getCategories_includesDescription() {
        Category c = Category.builder().id(1L).name("Фестиваль").description("Городские фестивали").build();
        when(categoryRepository.findAll()).thenReturn(List.of(c));

        CategoryResponse resp = directoryService.getCategories().get(0);

        assertThat(resp.getId()).isEqualTo(1L);
        assertThat(resp.getName()).isEqualTo("Фестиваль");
        assertThat(resp.getDescription()).isEqualTo("Городские фестивали");
    }

    // ─── getVenues ────────────────────────────────────────────────────────────

    // Неактивные площадки (active=false) должны быть исключены из ответа.
    // Репозиторий возвращает все, фильтрация — ответственность сервиса.
    @Test
    void getVenues_returnsOnlyActiveVenues() {
        City city = City.builder().id(1L).name("Коломна").active(true).createdAt(OffsetDateTime.now()).build();
        Venue active = Venue.builder().id(1L).name("Арт-центр").active(true).city(city).build();
        Venue inactive = Venue.builder().id(2L).name("Старый клуб").active(false).city(city).build();
        when(venueRepository.findAllByOrderByNameAsc()).thenReturn(List.of(active, inactive));

        List<VenueResponse> result = directoryService.getVenues();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("Арт-центр");
    }

    // Поля cityId, cityName, address, capacity должны корректно маппиться из связанных сущностей.
    @Test
    void getVenues_includesCityInfo() {
        City city = City.builder().id(5L).name("Москва").active(true).createdAt(OffsetDateTime.now()).build();
        Venue venue = Venue.builder().id(10L).name("Концертный зал").active(true)
            .address("ул. Арбат, 1").capacity(500).city(city).build();
        when(venueRepository.findAllByOrderByNameAsc()).thenReturn(List.of(venue));

        VenueResponse resp = directoryService.getVenues().get(0);

        assertThat(resp.getCityId()).isEqualTo(5L);
        assertThat(resp.getCityName()).isEqualTo("Москва");
        assertThat(resp.getAddress()).isEqualTo("ул. Арбат, 1");
        assertThat(resp.getCapacity()).isEqualTo(500);
    }

    // Пустой справочник площадок → пустой список.
    @Test
    void getVenues_emptyWhenNone() {
        when(venueRepository.findAllByOrderByNameAsc()).thenReturn(List.of());

        assertThat(directoryService.getVenues()).isEmpty();
    }

    // Площадка без привязанного города — cityId и cityName должны быть null, а не вызывать NPE.
    @Test
    void getVenues_venueWithNullCityHasNullCityFields() {
        Venue venue = Venue.builder().id(1L).name("Без города").active(true).city(null).build();
        when(venueRepository.findAllByOrderByNameAsc()).thenReturn(List.of(venue));

        VenueResponse resp = directoryService.getVenues().get(0);

        assertThat(resp.getCityId()).isNull();
        assertThat(resp.getCityName()).isNull();
    }

    // ─── getCities ────────────────────────────────────────────────────────────

    // Без фильтра возвращаются только активные города (active=true).
    // Неактивный город «Архивный» должен быть исключён.
    @Test
    void getCities_noQueryReturnsAllActiveCities() {
        City c1 = buildCity(1L, "Москва", "Москва", true);
        City c2 = buildCity(2L, "Казань", "Татарстан", true);
        City c3 = buildCity(3L, "Архивный", "Архивная", false);
        when(cityRepository.findAllByOrderByNameAsc()).thenReturn(List.of(c1, c2, c3));

        List<CityResponse> result = directoryService.getCities(null, null);

        assertThat(result).hasSize(2);
        assertThat(result).extracting(CityResponse::getName).containsExactlyInAnyOrder("Москва", "Казань");
    }

    // При наличии query используется search() — разная ветка логики.
    // Проверяем, что region и country=«Россия» тоже маппятся корректно.
    @Test
    void getCities_withQueryUsesSearchMethod() {
        City c = buildCity(1L, "Коломна", "Московская область", true);
        when(cityRepository.search("Коломна")).thenReturn(List.of(c));

        List<CityResponse> result = directoryService.getCities("Коломна", null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("Коломна");
        assertThat(result.get(0).getRegion()).isEqualTo("Московская область");
        assertThat(result.get(0).getCountry()).isEqualTo("Россия");
    }

    // Параметр limit обрезает список. Три города → 2 при limit=2.
    @Test
    void getCities_limitCapsResults() {
        City c1 = buildCity(1L, "Город1", "Регион", true);
        City c2 = buildCity(2L, "Город2", "Регион", true);
        City c3 = buildCity(3L, "Город3", "Регион", true);
        when(cityRepository.findAllByOrderByNameAsc()).thenReturn(List.of(c1, c2, c3));

        List<CityResponse> result = directoryService.getCities(null, 2);

        assertThat(result).hasSize(2);
    }

    // limit=0 трактуется как «без ограничения» — оба города возвращаются.
    @Test
    void getCities_zeroLimitIgnored() {
        City c1 = buildCity(1L, "Город1", "Регион", true);
        City c2 = buildCity(2L, "Город2", "Регион", true);
        when(cityRepository.findAllByOrderByNameAsc()).thenReturn(List.of(c1, c2));

        List<CityResponse> result = directoryService.getCities(null, 0);

        assertThat(result).hasSize(2);
    }

    // Поле active маппится в DTO — фронтенд использует его для отображения статуса.
    @Test
    void getCities_returnsActiveFieldCorrectly() {
        City c = buildCity(1L, "Активный", "Регион", true);
        when(cityRepository.findAllByOrderByNameAsc()).thenReturn(List.of(c));

        CityResponse resp = directoryService.getCities(null, null).get(0);

        assertThat(resp.getActive()).isTrue();
    }

    // ─── helpers ──────────────────────────────────────────────────────────────

    // Строит тестовый City с минимальными полями.
    private City buildCity(Long id, String name, String region, boolean active) {
        return City.builder()
            .id(id)
            .name(name)
            .region(region)
            .active(active)
            .createdAt(OffsetDateTime.now())
            .build();
    }
}

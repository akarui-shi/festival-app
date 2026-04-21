package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.AdminCategoryUpsertRequest;
import com.festivalapp.backend.dto.AdminCityUpsertRequest;
import com.festivalapp.backend.dto.AdminUserResponse;
import com.festivalapp.backend.dto.AdminVenueUpsertRequest;
import com.festivalapp.backend.dto.CategoryResponse;
import com.festivalapp.backend.dto.CityResponse;
import com.festivalapp.backend.dto.VenueResponse;
import com.festivalapp.backend.entity.Category;
import com.festivalapp.backend.entity.City;
import com.festivalapp.backend.entity.Role;
import com.festivalapp.backend.entity.RoleName;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.entity.UserRole;
import com.festivalapp.backend.entity.UserStatus;
import com.festivalapp.backend.entity.Venue;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.exception.ResourceNotFoundException;
import com.festivalapp.backend.repository.CategoryRepository;
import com.festivalapp.backend.repository.CityRepository;
import com.festivalapp.backend.repository.RoleRepository;
import com.festivalapp.backend.repository.UserRepository;
import com.festivalapp.backend.repository.UserRoleRepository;
import com.festivalapp.backend.repository.VenueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminManagementService {

    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final RoleRepository roleRepository;
    private final CategoryRepository categoryRepository;
    private final CityRepository cityRepository;
    private final VenueRepository venueRepository;
    private final AdminAuditService adminAuditService;

    @Transactional(readOnly = true)
    public List<AdminUserResponse> getUsers() {
        return userRepository.findAllWithRoles().stream()
            .map(this::toAdminUserResponse)
            .toList();
    }

    @Transactional
    public AdminUserResponse updateUserRoles(Long userId, Set<String> requestedRoles) {
        User user = userRepository.findByIdWithRoles(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (requestedRoles == null || requestedRoles.isEmpty()) {
            throw new BadRequestException("Хотя бы одна роль должна быть назначена");
        }

        Set<RoleName> roleNames = requestedRoles.stream()
            .map(RoleName::fromAny)
            .collect(Collectors.toSet());

        userRoleRepository.deleteByUserId(user.getId());
        user.getUserRoles().clear();

        OffsetDateTime now = OffsetDateTime.now();
        for (RoleName roleName : roleNames) {
            Role role = roleRepository.findByName(roleName)
                .orElseGet(() -> roleRepository.save(Role.builder().name(roleName.toDbName()).description("Системная роль").build()));

            UserRole userRole = userRoleRepository.save(UserRole.builder()
                .user(user)
                .role(role)
                .assignedAt(now)
                .build());
            user.getUserRoles().add(userRole);
        }

        adminAuditService.log(null, "USER_ROLES_UPDATED", "User", user.getId(), roleNames.toString());

        return toAdminUserResponse(userRepository.findByIdWithRoles(user.getId()).orElse(user));
    }

    @Transactional
    public AdminUserResponse updateUserActive(Long userId, boolean active) {
        User user = userRepository.findByIdWithRoles(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        user.setStatus(active ? UserStatus.ACTIVE : UserStatus.BLOCKED);
        user.setUpdatedAt(OffsetDateTime.now());
        adminAuditService.log(null, active ? "USER_UNBLOCKED" : "USER_BLOCKED", "User", user.getId(), user.getEmail());
        return toAdminUserResponse(userRepository.save(user));
    }

    @Transactional
    public CategoryResponse createCategory(AdminCategoryUpsertRequest request) {
        String name = normalizeRequired(request.getName(), "Category name is required");
        if (categoryRepository.existsByNameIgnoreCase(name)) {
            throw new BadRequestException("Категория с таким названием уже существует");
        }

        Category category = categoryRepository.save(Category.builder()
            .name(name)
            .description(normalizeOptional(request.getDescription()))
            .build());
        adminAuditService.log(null, "CATEGORY_CREATED", "Category", category.getId(), category.getName());

        return toCategoryResponse(category);
    }

    @Transactional
    public CategoryResponse updateCategory(Long id, AdminCategoryUpsertRequest request) {
        Category category = categoryRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Category not found"));

        String name = normalizeRequired(request.getName(), "Category name is required");
        categoryRepository.findByNameIgnoreCase(name).ifPresent(existing -> {
            if (!existing.getId().equals(id)) {
                throw new BadRequestException("Категория с таким названием уже существует");
            }
        });

        category.setName(name);
        category.setDescription(normalizeOptional(request.getDescription()));
        Category saved = categoryRepository.save(category);
        adminAuditService.log(null, "CATEGORY_UPDATED", "Category", saved.getId(), saved.getName());
        return toCategoryResponse(saved);
    }

    @Transactional
    public Map<String, Object> deleteCategory(Long id) {
        Category category = categoryRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        try {
            categoryRepository.delete(category);
        } catch (DataIntegrityViolationException ex) {
            throw new BadRequestException("Категория используется и не может быть удалена");
        }
        adminAuditService.log(null, "CATEGORY_DELETED", "Category", category.getId(), category.getName());
        return Map.of("success", true);
    }

    @Transactional(readOnly = true)
    public List<CityResponse> getCities() {
        return cityRepository.findAllByOrderByNameAsc().stream()
            .map(city -> toCityResponse(city, null))
            .toList();
    }

    @Transactional
    public CityResponse createCity(AdminCityUpsertRequest request) {
        String name = normalizeRequired(request.getName(), "City name is required");
        String region = normalizeOptional(request.getRegion());

        cityRepository.findFirstByNameIgnoreCaseAndRegionIgnoreCase(name, region == null ? "" : region)
            .ifPresent(existing -> {
                throw new BadRequestException("Город уже существует");
            });

        City city = cityRepository.save(City.builder()
            .name(name)
            .region(region)
            .active(request.getActive() == null || request.getActive())
            .createdAt(OffsetDateTime.now())
            .country(normalizeOptional(request.getCountry()))
            .build());
        adminAuditService.log(null, "CITY_CREATED", "City", city.getId(), city.getName());

        return toCityResponse(city, request.getCountry());
    }

    @Transactional
    public CityResponse updateCity(Long id, AdminCityUpsertRequest request) {
        City city = cityRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("City not found"));

        city.setName(normalizeRequired(request.getName(), "City name is required"));
        city.setRegion(normalizeOptional(request.getRegion()));
        if (request.getActive() != null) {
            city.setActive(request.getActive());
        }
        City saved = cityRepository.save(city);
        adminAuditService.log(null, "CITY_UPDATED", "City", saved.getId(), saved.getName());
        return toCityResponse(saved, request.getCountry());
    }

    @Transactional
    public CityResponse updateCityActive(Long id, boolean active) {
        City city = cityRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("City not found"));
        city.setActive(active);
        City saved = cityRepository.save(city);
        adminAuditService.log(null, active ? "CITY_ACTIVATED" : "CITY_DEACTIVATED", "City", saved.getId(), saved.getName());
        return toCityResponse(saved, null);
    }

    @Transactional
    public Map<String, Object> deleteCity(Long id) {
        City city = cityRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("City not found"));
        try {
            cityRepository.delete(city);
        } catch (DataIntegrityViolationException ex) {
            throw new BadRequestException("Город используется и не может быть удалён");
        }
        adminAuditService.log(null, "CITY_DELETED", "City", city.getId(), city.getName());
        return Map.of("success", true);
    }

    @Transactional
    public VenueResponse createVenue(AdminVenueUpsertRequest request) {
        City city = cityRepository.findById(request.getCityId())
            .orElseThrow(() -> new ResourceNotFoundException("City not found"));

        Venue venue = venueRepository.save(Venue.builder()
            .city(city)
            .name(normalizeRequired(request.getName(), "Venue name is required"))
            .address(normalizeRequired(request.getAddress(), "Venue address is required"))
            .description(null)
            .capacity(request.getCapacity())
            .latitude(request.getLatitude())
            .longitude(request.getLongitude())
            .active(true)
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .contacts(normalizeOptional(request.getContacts()))
            .build());
        adminAuditService.log(null, "VENUE_CREATED", "Venue", venue.getId(), venue.getName());

        return toVenueResponse(venue, request.getContacts());
    }

    @Transactional
    public VenueResponse updateVenue(Long id, AdminVenueUpsertRequest request) {
        Venue venue = venueRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Venue not found"));

        if (request.getCityId() != null && (venue.getCity() == null || !venue.getCity().getId().equals(request.getCityId()))) {
            City city = cityRepository.findById(request.getCityId())
                .orElseThrow(() -> new ResourceNotFoundException("City not found"));
            venue.setCity(city);
        }

        venue.setName(normalizeRequired(request.getName(), "Venue name is required"));
        venue.setAddress(normalizeRequired(request.getAddress(), "Venue address is required"));
        venue.setCapacity(request.getCapacity());
        venue.setLatitude(request.getLatitude());
        venue.setLongitude(request.getLongitude());
        venue.setUpdatedAt(OffsetDateTime.now());
        venue.setContacts(normalizeOptional(request.getContacts()));

        Venue saved = venueRepository.save(venue);
        adminAuditService.log(null, "VENUE_UPDATED", "Venue", saved.getId(), saved.getName());
        return toVenueResponse(saved, request.getContacts());
    }

    @Transactional
    public Map<String, Object> deleteVenue(Long id) {
        Venue venue = venueRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Venue not found"));
        try {
            venueRepository.delete(venue);
        } catch (DataIntegrityViolationException ex) {
            throw new BadRequestException("Площадка используется и не может быть удалена");
        }
        adminAuditService.log(null, "VENUE_DELETED", "Venue", venue.getId(), venue.getName());
        return Map.of("success", true);
    }

    private AdminUserResponse toAdminUserResponse(User user) {
        Set<String> roles = user.getUserRoles() == null
            ? new HashSet<>()
            : user.getUserRoles().stream()
                .map(userRole -> userRole.getRole().toRoleName().toApiName())
                .collect(Collectors.toCollection(HashSet::new));

        return AdminUserResponse.builder()
            .id(user.getId())
            .login(user.getLogin())
            .email(user.getEmail())
            .firstName(user.getFirstName())
            .lastName(user.getLastName())
            .phone(user.getPhone())
            .roles(roles)
            .active(user.isActive())
            .build();
    }

    private CategoryResponse toCategoryResponse(Category category) {
        return CategoryResponse.builder()
            .id(category.getId())
            .name(category.getName())
            .description(category.getDescription())
            .build();
    }

    private CityResponse toCityResponse(City city, String explicitCountry) {
        return CityResponse.builder()
            .id(city.getId())
            .name(city.getName())
            .region(city.getRegion())
            .country(StringUtils.hasText(explicitCountry) ? explicitCountry.trim() : "Россия")
            .active(city.isActive())
            .build();
    }

    private VenueResponse toVenueResponse(Venue venue, String contacts) {
        return VenueResponse.builder()
            .id(venue.getId())
            .name(venue.getName())
            .address(venue.getAddress())
            .contacts(StringUtils.hasText(contacts) ? contacts.trim() : null)
            .latitude(venue.getLatitude())
            .longitude(venue.getLongitude())
            .capacity(venue.getCapacity())
            .cityId(venue.getCity() == null ? null : venue.getCity().getId())
            .cityName(venue.getCity() == null ? null : venue.getCity().getName())
            .build();
    }

    private String normalizeRequired(String value, String message) {
        if (!StringUtils.hasText(value)) {
            throw new BadRequestException(message);
        }
        return value.trim();
    }

    private String normalizeOptional(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }
}

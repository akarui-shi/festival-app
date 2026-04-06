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
import com.festivalapp.backend.entity.Organization;
import com.festivalapp.backend.entity.Organizer;
import com.festivalapp.backend.entity.Role;
import com.festivalapp.backend.entity.RoleName;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.entity.UserRole;
import com.festivalapp.backend.entity.UserRoleId;
import com.festivalapp.backend.entity.UserStatus;
import com.festivalapp.backend.entity.Venue;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.exception.ResourceNotFoundException;
import com.festivalapp.backend.repository.CategoryRepository;
import com.festivalapp.backend.repository.CityRepository;
import com.festivalapp.backend.repository.OrganizationRepository;
import com.festivalapp.backend.repository.OrganizerRepository;
import com.festivalapp.backend.repository.RoleRepository;
import com.festivalapp.backend.repository.UserRepository;
import com.festivalapp.backend.repository.VenueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminManagementService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final OrganizationRepository organizationRepository;
    private final OrganizerRepository organizerRepository;
    private final CategoryRepository categoryRepository;
    private final CityRepository cityRepository;
    private final VenueRepository venueRepository;

    @Transactional(readOnly = true)
    public List<AdminUserResponse> getUsers() {
        return userRepository.findAllWithRoles().stream()
            .map(this::toAdminUserResponse)
            .toList();
    }

    @Transactional
    public AdminUserResponse updateUserRoles(Long userId, Set<String> requestedRoles) {
        User user = userRepository.findByIdWithRoles(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        Set<RoleName> roleNames = normalizeRequestedRoles(requestedRoles);
        Set<Role> roles = roleNames.stream()
            .map(this::resolveRoleEntity)
            .collect(Collectors.toCollection(LinkedHashSet::new));

        user.getUserRoles().clear();
        for (Role role : roles) {
            UserRoleId userRoleId = UserRoleId.builder()
                .userId(user.getId())
                .roleId(role.getId())
                .build();
            user.getUserRoles().add(UserRole.builder()
                .id(userRoleId)
                .user(user)
                .role(role)
                .build());
        }

        ensureOrganizationProfileIfNeeded(user, roleNames);
        User saved = userRepository.save(user);
        return toAdminUserResponse(saved);
    }

    @Transactional
    public AdminUserResponse updateUserActive(Long userId, boolean active) {
        User user = userRepository.findByIdWithRoles(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        user.setStatus(active ? UserStatus.ACTIVE : UserStatus.BLOCKED);
        User saved = userRepository.save(user);
        return toAdminUserResponse(saved);
    }

    @Transactional
    public CategoryResponse createCategory(AdminCategoryUpsertRequest request) {
        String name = normalizeRequired(request.getName(), "Category name is required");
        categoryRepository.findByNameIgnoreCase(name).ifPresent(existing -> {
            throw new BadRequestException("Category already exists");
        });

        Category saved = categoryRepository.save(Category.builder()
            .name(name)
            .description(request.getDescription())
            .build());
        return toCategoryResponse(saved);
    }

    @Transactional
    public CategoryResponse updateCategory(Long id, AdminCategoryUpsertRequest request) {
        Category category = categoryRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + id));
        String name = normalizeRequired(request.getName(), "Category name is required");

        categoryRepository.findByNameIgnoreCase(name).ifPresent(existing -> {
            if (!existing.getId().equals(id)) {
                throw new BadRequestException("Category name already exists");
            }
        });

        category.setName(name);
        category.setDescription(request.getDescription());
        Category saved = categoryRepository.save(category);
        return toCategoryResponse(saved);
    }

    @Transactional
    public Map<String, Object> deleteCategory(Long id) {
        Category category = categoryRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + id));
        categoryRepository.delete(category);
        return Map.of("message", "Category deleted successfully", "categoryId", id);
    }

    @Transactional
    public CityResponse createCity(AdminCityUpsertRequest request) {
        City saved = cityRepository.save(City.builder()
            .name(normalizeRequired(request.getName(), "City name is required"))
            .region(normalizeOptional(request.getRegion()))
            .country(normalizeOptional(request.getCountry()))
            .build());
        return toCityResponse(saved);
    }

    @Transactional
    public CityResponse updateCity(Long id, AdminCityUpsertRequest request) {
        City city = cityRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("City not found: " + id));

        city.setName(normalizeRequired(request.getName(), "City name is required"));
        city.setRegion(normalizeOptional(request.getRegion()));
        city.setCountry(normalizeOptional(request.getCountry()));
        City saved = cityRepository.save(city);
        return toCityResponse(saved);
    }

    @Transactional
    public Map<String, Object> deleteCity(Long id) {
        City city = cityRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("City not found: " + id));
        cityRepository.delete(city);
        return Map.of("message", "City deleted successfully", "cityId", id);
    }

    @Transactional
    public VenueResponse createVenue(AdminVenueUpsertRequest request) {
        City city = cityRepository.findById(request.getCityId())
            .orElseThrow(() -> new ResourceNotFoundException("City not found: " + request.getCityId()));

        Venue saved = venueRepository.save(Venue.builder()
            .name(normalizeRequired(request.getName(), "Venue name is required"))
            .address(normalizeRequired(request.getAddress(), "Venue address is required"))
            .contacts(normalizeOptional(request.getContacts()))
            .capacity(request.getCapacity())
            .latitude(request.getLatitude())
            .longitude(request.getLongitude())
            .city(city)
            .build());
        return toVenueResponse(saved);
    }

    @Transactional
    public VenueResponse updateVenue(Long id, AdminVenueUpsertRequest request) {
        Venue venue = venueRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Venue not found: " + id));
        City city = cityRepository.findById(request.getCityId())
            .orElseThrow(() -> new ResourceNotFoundException("City not found: " + request.getCityId()));

        venue.setName(normalizeRequired(request.getName(), "Venue name is required"));
        venue.setAddress(normalizeRequired(request.getAddress(), "Venue address is required"));
        venue.setContacts(normalizeOptional(request.getContacts()));
        venue.setCapacity(request.getCapacity());
        venue.setLatitude(request.getLatitude());
        venue.setLongitude(request.getLongitude());
        venue.setCity(city);

        Venue saved = venueRepository.save(venue);
        return toVenueResponse(saved);
    }

    @Transactional
    public Map<String, Object> deleteVenue(Long id) {
        Venue venue = venueRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Venue not found: " + id));
        venueRepository.delete(venue);
        return Map.of("message", "Venue deleted successfully", "venueId", id);
    }

    private Set<RoleName> normalizeRequestedRoles(Set<String> requestedRoles) {
        if (requestedRoles == null || requestedRoles.isEmpty()) {
            throw new BadRequestException("At least one role is required");
        }

        Set<RoleName> normalizedRoles = requestedRoles.stream()
            .map(this::toRoleName)
            .collect(Collectors.toCollection(LinkedHashSet::new));

        if (normalizedRoles.isEmpty()) {
            throw new BadRequestException("At least one role is required");
        }
        return normalizedRoles;
    }

    private RoleName toRoleName(String requestedRole) {
        if (!StringUtils.hasText(requestedRole)) {
            throw new BadRequestException("Role value is invalid");
        }
        String normalized = requestedRole.trim().toUpperCase(Locale.ROOT);
        String prefixed = normalized.startsWith("ROLE_") ? normalized : "ROLE_" + normalized;
        try {
            return RoleName.valueOf(prefixed);
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Unsupported role: " + requestedRole);
        }
    }

    private Role resolveRoleEntity(RoleName roleName) {
        return roleRepository.findByName(roleName)
            .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + roleName.name()));
    }

    private void ensureOrganizationProfileIfNeeded(User user, Set<RoleName> roleNames) {
        if (!roleNames.contains(RoleName.ROLE_ORGANIZER)) {
            return;
        }

        if (organizerRepository.findByUserId(user.getId()).isPresent()) {
            return;
        }

        String organizationName = buildDefaultOrganizationName(user);
        String contacts = user.getPhone() != null
            ? user.getEmail() + ", " + user.getPhone()
            : user.getEmail();

        Organization organization = organizationRepository.findByNameIgnoreCase(organizationName)
            .orElseGet(() -> organizationRepository.save(Organization.builder()
            .name(organizationName)
            .description("Профиль организации")
            .contacts(contacts)
            .build()));
        organizerRepository.save(Organizer.builder()
            .user(user)
            .organization(organization)
            .build());
    }

    private String buildDefaultOrganizationName(User user) {
        String fullName = ((user.getFirstName() == null ? "" : user.getFirstName()) + " "
            + (user.getLastName() == null ? "" : user.getLastName())).trim();
        return fullName.isEmpty() ? user.getLogin() : fullName;
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

    private AdminUserResponse toAdminUserResponse(User user) {
        Set<String> roles = user.getUserRoles().stream()
            .map(userRole -> normalizeRoleName(userRole.getRole().getName()))
            .collect(Collectors.toCollection(LinkedHashSet::new));

        return AdminUserResponse.builder()
            .id(user.getId())
            .login(user.getLogin())
            .email(user.getEmail())
            .firstName(user.getFirstName())
            .lastName(user.getLastName())
            .phone(user.getPhone())
            .roles(roles)
            .active(user.getStatus() == UserStatus.ACTIVE)
            .build();
    }

    private String normalizeRoleName(RoleName roleName) {
        String raw = roleName.name();
        return raw.startsWith("ROLE_") ? raw.substring(5) : raw;
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
            .country(city.getCountry())
            .build();
    }

    private VenueResponse toVenueResponse(Venue venue) {
        return VenueResponse.builder()
            .id(venue.getId())
            .name(venue.getName())
            .address(venue.getAddress())
            .contacts(venue.getContacts())
            .latitude(venue.getLatitude())
            .longitude(venue.getLongitude())
            .capacity(venue.getCapacity())
            .cityId(venue.getCity() != null ? venue.getCity().getId() : null)
            .cityName(venue.getCity() != null ? venue.getCity().getName() : null)
            .build();
    }
}

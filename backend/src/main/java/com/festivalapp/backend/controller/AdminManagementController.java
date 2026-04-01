package com.festivalapp.backend.controller;

import com.festivalapp.backend.dto.AdminCategoryUpsertRequest;
import com.festivalapp.backend.dto.AdminCityUpsertRequest;
import com.festivalapp.backend.dto.AdminUserActiveUpdateRequest;
import com.festivalapp.backend.dto.AdminUserResponse;
import com.festivalapp.backend.dto.AdminUserRolesUpdateRequest;
import com.festivalapp.backend.dto.AdminVenueUpsertRequest;
import com.festivalapp.backend.dto.CategoryResponse;
import com.festivalapp.backend.dto.CityResponse;
import com.festivalapp.backend.dto.VenueResponse;
import com.festivalapp.backend.service.AdminManagementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminManagementController {

    private final AdminManagementService adminManagementService;

    @GetMapping("/users")
    public ResponseEntity<List<AdminUserResponse>> getUsers() {
        return ResponseEntity.ok(adminManagementService.getUsers());
    }

    @PatchMapping("/users/{id}/roles")
    public ResponseEntity<AdminUserResponse> updateUserRoles(@PathVariable Long id,
                                                             @Valid @RequestBody AdminUserRolesUpdateRequest request) {
        return ResponseEntity.ok(adminManagementService.updateUserRoles(id, request.getRoles()));
    }

    @PatchMapping("/users/{id}/active")
    public ResponseEntity<AdminUserResponse> updateUserActive(@PathVariable Long id,
                                                              @Valid @RequestBody AdminUserActiveUpdateRequest request) {
        return ResponseEntity.ok(adminManagementService.updateUserActive(id, request.getActive()));
    }

    @PostMapping("/categories")
    public ResponseEntity<CategoryResponse> createCategory(@Valid @RequestBody AdminCategoryUpsertRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminManagementService.createCategory(request));
    }

    @PutMapping("/categories/{id}")
    public ResponseEntity<CategoryResponse> updateCategory(@PathVariable Long id,
                                                           @Valid @RequestBody AdminCategoryUpsertRequest request) {
        return ResponseEntity.ok(adminManagementService.updateCategory(id, request));
    }

    @DeleteMapping("/categories/{id}")
    public ResponseEntity<Map<String, Object>> deleteCategory(@PathVariable Long id) {
        return ResponseEntity.ok(adminManagementService.deleteCategory(id));
    }

    @PostMapping("/cities")
    public ResponseEntity<CityResponse> createCity(@Valid @RequestBody AdminCityUpsertRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminManagementService.createCity(request));
    }

    @PutMapping("/cities/{id}")
    public ResponseEntity<CityResponse> updateCity(@PathVariable Long id,
                                                   @Valid @RequestBody AdminCityUpsertRequest request) {
        return ResponseEntity.ok(adminManagementService.updateCity(id, request));
    }

    @DeleteMapping("/cities/{id}")
    public ResponseEntity<Map<String, Object>> deleteCity(@PathVariable Long id) {
        return ResponseEntity.ok(adminManagementService.deleteCity(id));
    }

    @PostMapping("/venues")
    public ResponseEntity<VenueResponse> createVenue(@Valid @RequestBody AdminVenueUpsertRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminManagementService.createVenue(request));
    }

    @PutMapping("/venues/{id}")
    public ResponseEntity<VenueResponse> updateVenue(@PathVariable Long id,
                                                     @Valid @RequestBody AdminVenueUpsertRequest request) {
        return ResponseEntity.ok(adminManagementService.updateVenue(id, request));
    }

    @DeleteMapping("/venues/{id}")
    public ResponseEntity<Map<String, Object>> deleteVenue(@PathVariable Long id) {
        return ResponseEntity.ok(adminManagementService.deleteVenue(id));
    }
}


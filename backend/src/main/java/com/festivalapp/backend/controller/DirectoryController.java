package com.festivalapp.backend.controller;

import com.festivalapp.backend.dto.CategoryResponse;
import com.festivalapp.backend.dto.CityResponse;
import com.festivalapp.backend.dto.VenueResponse;
import com.festivalapp.backend.service.DirectoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class DirectoryController {

    private final DirectoryService directoryService;

    @GetMapping("/categories")
    public ResponseEntity<List<CategoryResponse>> getCategories() {
        return ResponseEntity.ok(directoryService.getCategories());
    }

    @GetMapping("/venues")
    public ResponseEntity<List<VenueResponse>> getVenues() {
        return ResponseEntity.ok(directoryService.getVenues());
    }

    @GetMapping("/cities")
    public ResponseEntity<List<CityResponse>> getCities() {
        return ResponseEntity.ok(directoryService.getCities());
    }
}

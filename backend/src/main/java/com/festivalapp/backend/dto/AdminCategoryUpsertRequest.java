package com.festivalapp.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AdminCategoryUpsertRequest {

    @NotBlank(message = "Category name is required")
    @Size(max = 255, message = "Category name is too long")
    private String name;

    @Size(max = 1000, message = "Category description is too long")
    private String description;
}


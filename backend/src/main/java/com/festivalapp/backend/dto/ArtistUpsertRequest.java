package com.festivalapp.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ArtistUpsertRequest {

    @NotBlank
    private String name;

    private String stageName;

    private String description;

    private String genre;
}

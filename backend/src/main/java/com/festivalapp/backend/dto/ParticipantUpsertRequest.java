package com.festivalapp.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class ParticipantUpsertRequest {

    @NotBlank
    private String name;

    private String stageName;

    private String description;

    private String genre;

    /**
     * Тип участника. Допустимые значения: исполнитель, лектор, экскурсовод, ансамбль, спикер, другое.
     * Если не задано — будет использован default "исполнитель".
     */
    private String kind;

    /**
     * Legacy single-image field, kept for backward compatibility.
     */
    private Long imageId;

    /**
     * Preferred multi-image field.
     */
    private List<Long> imageIds;

    /**
     * Optional primary image id. If omitted, first image becomes primary.
     */
    private Long primaryImageId;
}

package com.festivalapp.backend.dto;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PublicationUpdateRequest {

    @Size(min = 1, max = 255, message = "Title must be between 1 and 255 characters")
    private String title;

    private String content;

    private Long eventId;
}

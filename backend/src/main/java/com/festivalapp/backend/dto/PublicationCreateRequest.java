package com.festivalapp.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class PublicationCreateRequest {

    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title is too long")
    private String title;

    @NotBlank(message = "Content is required")
    private String content;

    private String imageUrl;
    private List<String> imageUrls;

    @NotNull(message = "Event is required")
    private Long eventId;
}

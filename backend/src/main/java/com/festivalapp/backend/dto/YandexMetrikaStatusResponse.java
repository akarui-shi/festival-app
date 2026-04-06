package com.festivalapp.backend.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class YandexMetrikaStatusResponse {

    private boolean enabled;
    private boolean configured;
    private boolean available;
    private String message;
    private List<String> warnings;
}

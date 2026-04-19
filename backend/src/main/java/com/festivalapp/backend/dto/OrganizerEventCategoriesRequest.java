package com.festivalapp.backend.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.Set;

@Getter
@Setter
public class OrganizerEventCategoriesRequest {

    private Set<Long> categoryIds;
}

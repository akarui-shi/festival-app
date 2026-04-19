package com.festivalapp.backend.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class OrganizerEventWizardValidationIssue {

    private String code;
    private String message;
    private String step;
}

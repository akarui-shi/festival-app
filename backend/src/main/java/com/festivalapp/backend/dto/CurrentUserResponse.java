package com.festivalapp.backend.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.Set;

@Getter
@Builder
public class CurrentUserResponse {

    private Long id;
    private String login;
    private String email;
    private String firstName;
    private String lastName;
    private String phone;
    private String avatarUrl;
    private Set<String> roles;
    private OrganizationInfo organization;

    @Getter
    @Builder
    public static class OrganizationInfo {
        private Long id;
        private String name;
        private String description;
        private String contacts;
    }
}

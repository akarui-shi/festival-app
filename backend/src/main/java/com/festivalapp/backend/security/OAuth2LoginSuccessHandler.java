package com.festivalapp.backend.security;

import com.festivalapp.backend.dto.AuthResponse;
import com.festivalapp.backend.service.SocialAuthService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

    private final SocialAuthService socialAuthService;

    @Value("${app.frontend-base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        if (!(authentication instanceof OAuth2AuthenticationToken oauth2AuthenticationToken)) {
            response.sendRedirect(buildErrorRedirect("oauth_authentication_failed"));
            return;
        }

        try {
            AuthResponse authResponse = socialAuthService.loginWithOAuth2(oauth2AuthenticationToken);
            response.sendRedirect(buildSuccessRedirect(authResponse.getToken()));
        } catch (Exception ex) {
            response.sendRedirect(buildErrorRedirect("social_login_failed"));
        }
    }

    private String buildSuccessRedirect(String token) {
        return UriComponentsBuilder.fromHttpUrl(frontendBaseUrl)
            .path("/oauth/callback")
            .queryParam("token", token)
            .build(true)
            .toUriString();
    }

    private String buildErrorRedirect(String errorCode) {
        return UriComponentsBuilder.fromHttpUrl(frontendBaseUrl)
            .path("/oauth/callback")
            .queryParam("error", errorCode)
            .build(true)
            .toUriString();
    }
}

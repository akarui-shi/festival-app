package com.festivalapp.backend.security;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.util.StringUtils;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.util.Locale;

@Component
@Slf4j
public class OAuth2LoginFailureHandler implements AuthenticationFailureHandler {

    @Value("${app.frontend-base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    @Override
    public void onAuthenticationFailure(HttpServletRequest request,
                                        HttpServletResponse response,
                                        AuthenticationException exception) throws IOException, ServletException {
        String providerError = normalize(request.getParameter("error"));
        String providerErrorDescription = normalize(request.getParameter("error_description"));
        String resolvedErrorCode = resolveErrorCode(providerError, exception);

        if (exception != null) {
            log.warn("OAuth2 login failed: resolvedErrorCode={}, providerError={}, providerErrorDescription={}, exception={}",
                resolvedErrorCode,
                providerError,
                providerErrorDescription,
                exception.getMessage());
        }

        UriComponentsBuilder redirectBuilder = UriComponentsBuilder.fromHttpUrl(frontendBaseUrl)
            .path("/oauth/callback")
            .queryParam("error", resolvedErrorCode);

        if (StringUtils.hasText(providerError)) {
            redirectBuilder.queryParam("provider_error", providerError);
        }
        if (StringUtils.hasText(providerErrorDescription)) {
            redirectBuilder.queryParam("provider_error_description", providerErrorDescription);
        }

        String redirectUrl = redirectBuilder.build(true).toUriString();

        response.sendRedirect(redirectUrl);
    }

    private String resolveErrorCode(String providerError, AuthenticationException exception) {
        if (StringUtils.hasText(providerError)) {
            if ("access_denied".equalsIgnoreCase(providerError)) {
                return "oauth_access_denied";
            }
            return "oauth_provider_error";
        }

        if (exception instanceof OAuth2AuthenticationException oauth2Exception) {
            String oauthErrorCode = normalize(oauth2Exception.getError() == null
                ? null
                : oauth2Exception.getError().getErrorCode());
            if (!StringUtils.hasText(oauthErrorCode)) {
                return "oauth_authentication_failed";
            }

            return switch (oauthErrorCode.toLowerCase(Locale.ROOT)) {
                case "access_denied" -> "oauth_access_denied";
                case "authorization_request_not_found", "invalid_state_parameter" -> "oauth_session_expired";
                case "invalid_token_response", "invalid_user_info_response" -> "oauth_provider_error";
                default -> "oauth_authentication_failed";
            };
        }

        return exception == null ? "oauth_authentication_failed" : "oauth_provider_error";
    }

    private String normalize(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }
}

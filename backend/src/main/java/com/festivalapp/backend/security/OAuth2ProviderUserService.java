package com.festivalapp.backend.security;

import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class OAuth2ProviderUserService implements OAuth2UserService<OAuth2UserRequest, OAuth2User> {

    private final RestTemplate restTemplate = new RestTemplate();

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        String userInfoUri = userRequest.getClientRegistration().getProviderDetails().getUserInfoEndpoint().getUri();
        String accessToken = userRequest.getAccessToken().getTokenValue();

        Map<String, Object> rawAttributes = requestUserInfo(userInfoUri, accessToken);
        Map<String, Object> attributes = normalizeAttributes(registrationId, rawAttributes);

        String nameAttributeKey = resolveNameAttributeKey(attributes);
        Collection<GrantedAuthority> authorities = buildAuthorities(userRequest);

        return new DefaultOAuth2User(authorities, attributes, nameAttributeKey);
    }

    private Map<String, Object> requestUserInfo(String userInfoUri, String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));

        try {
            return restTemplate.exchange(
                    userInfoUri,
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    new ParameterizedTypeReference<Map<String, Object>>() {
                    }
                )
                .getBody();
        } catch (RestClientException ex) {
            return restTemplate.exchange(
                    userInfoUri,
                    HttpMethod.POST,
                    new HttpEntity<>(headers),
                    new ParameterizedTypeReference<Map<String, Object>>() {
                    }
                )
                .getBody();
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> normalizeAttributes(String registrationId, Map<String, Object> rawAttributes) {
        Map<String, Object> attributes = rawAttributes == null ? new HashMap<>() : new HashMap<>(rawAttributes);

        Object nestedUser = attributes.get("user");
        if (nestedUser instanceof Map<?, ?> nestedMap) {
            nestedMap.forEach((key, value) -> attributes.putIfAbsent(String.valueOf(key), value));
        }

        Object response = attributes.get("response");
        if (response instanceof List<?> responseList && !responseList.isEmpty() && responseList.get(0) instanceof Map<?, ?> firstItem) {
            firstItem.forEach((key, value) -> attributes.putIfAbsent(String.valueOf(key), value));
        }

        if (!StringUtils.hasText(stringValue(attributes.get("id")))) {
            String fallbackId = firstNotBlank(
                stringValue(attributes.get("user_id")),
                stringValue(attributes.get("sub"))
            );
            if (StringUtils.hasText(fallbackId)) {
                attributes.put("id", fallbackId);
            }
        }

        if ("yandex".equalsIgnoreCase(registrationId)
            && !StringUtils.hasText(stringValue(attributes.get("email")))
            && StringUtils.hasText(stringValue(attributes.get("default_email")))) {
            attributes.put("email", stringValue(attributes.get("default_email")));
        }

        return attributes;
    }

    private String resolveNameAttributeKey(Map<String, Object> attributes) {
        if (StringUtils.hasText(stringValue(attributes.get("id")))) {
            return "id";
        }
        if (StringUtils.hasText(stringValue(attributes.get("user_id")))) {
            return "user_id";
        }
        if (StringUtils.hasText(stringValue(attributes.get("sub")))) {
            return "sub";
        }
        throw new OAuth2AuthenticationException("Не удалось определить идентификатор пользователя у OAuth2-провайдера");
    }

    private Collection<GrantedAuthority> buildAuthorities(OAuth2UserRequest userRequest) {
        Collection<GrantedAuthority> authorities = new ArrayList<>();
        if (!CollectionUtils.isEmpty(userRequest.getAccessToken().getScopes())) {
            userRequest.getAccessToken().getScopes().forEach(scope ->
                authorities.add(new SimpleGrantedAuthority("SCOPE_" + scope))
            );
        }
        if (authorities.isEmpty()) {
            authorities.add(new SimpleGrantedAuthority("ROLE_USER"));
        }
        return authorities;
    }

    private String stringValue(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private String firstNotBlank(String... values) {
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value.trim();
            }
        }
        return null;
    }
}

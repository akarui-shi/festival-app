package com.festivalapp.backend.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "yandex.metrika")
public class YandexMetrikaProperties {

    private boolean enabled;
    private String token;
    private String counterId;
}

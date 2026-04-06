package com.festivalapp.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.festivalapp.backend.config.YandexMetrikaProperties;
import com.festivalapp.backend.dto.AnalyticsDatePointResponse;
import com.festivalapp.backend.dto.AnalyticsTrafficSourceResponse;
import com.festivalapp.backend.dto.YandexMetrikaStatusResponse;
import lombok.Builder;
import lombok.Getter;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
public class YandexMetrikaService {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE;

    private final YandexMetrikaProperties properties;
    private final RestClient restClient;

    public YandexMetrikaService(YandexMetrikaProperties properties, RestClient.Builder restClientBuilder) {
        this.properties = properties;
        this.restClient = restClientBuilder
            .baseUrl("https://api-metrika.yandex.net")
            .build();
    }

    public boolean isEnabled() {
        return properties.isEnabled();
    }

    public boolean isConfigured() {
        return StringUtils.hasText(properties.getToken()) && StringUtils.hasText(properties.getCounterId());
    }

    public YandexMetrikaStatusResponse getConfigurationStatus() {
        if (!isEnabled()) {
            return YandexMetrikaStatusResponse.builder()
                .enabled(false)
                .configured(false)
                .available(false)
                .message("Интеграция с Яндекс Метрикой выключена.")
                .warnings(List.of())
                .build();
        }

        if (!isConfigured()) {
            return YandexMetrikaStatusResponse.builder()
                .enabled(true)
                .configured(false)
                .available(false)
                .message("Метрика не настроена: укажите token и counter-id.")
                .warnings(List.of())
                .build();
        }

        return YandexMetrikaStatusResponse.builder()
            .enabled(true)
            .configured(true)
            .available(true)
            .message("Интеграция с Яндекс Метрикой активна.")
            .warnings(List.of())
            .build();
    }

    public EventTrafficReport loadEventTraffic(String eventPath, LocalDate fromDate, LocalDate toDate) {
        YandexMetrikaStatusResponse configStatus = getConfigurationStatus();
        if (!configStatus.isAvailable()) {
            return EventTrafficReport.builder()
                .pageViews(0)
                .uniqueVisitors(0)
                .bounceRate(null)
                .pageDepth(null)
                .trafficSources(List.of())
                .visitsByDay(List.of())
                .status(configStatus)
                .build();
        }

        String filter = buildStartPathFilter(eventPath);
        List<String> warnings = new ArrayList<>();

        long pageViews;
        long uniqueVisitors;
        Double bounceRate;
        Double pageDepth;

        try {
            JsonNode summary = requestData(
                "ym:s:pageviews,ym:s:users,ym:s:bounceRate,ym:s:pageDepth",
                null,
                null,
                filter,
                fromDate,
                toDate,
                null
            );

            JsonNode totals = summary.path("totals");
            pageViews = readLongFromArray(totals, 0);
            uniqueVisitors = readLongFromArray(totals, 1);
            bounceRate = readDoubleFromArrayOrNull(totals, 2);
            pageDepth = readDoubleFromArrayOrNull(totals, 3);
        } catch (Exception ex) {
            return EventTrafficReport.builder()
                .pageViews(0)
                .uniqueVisitors(0)
                .bounceRate(null)
                .pageDepth(null)
                .trafficSources(List.of())
                .visitsByDay(List.of())
                .status(YandexMetrikaStatusResponse.builder()
                    .enabled(true)
                    .configured(true)
                    .available(false)
                    .message("Не удалось получить данные Яндекс Метрики.")
                    .warnings(List.of())
                    .build())
                .build();
        }

        List<AnalyticsDatePointResponse> visitsByDay = List.of();
        try {
            JsonNode trends = requestData(
                "ym:s:pageviews",
                "ym:s:date",
                "ym:s:date",
                filter,
                fromDate,
                toDate,
                200
            );
            visitsByDay = parseDateSeries(trends);
        } catch (Exception ex) {
            warnings.add("Не удалось загрузить динамику посещений по дням.");
        }

        List<AnalyticsTrafficSourceResponse> trafficSources = List.of();
        try {
            JsonNode sourceData = requestData(
                "ym:s:visits",
                "ym:s:lastTrafficSource",
                "-ym:s:visits",
                filter,
                fromDate,
                toDate,
                12
            );
            trafficSources = parseTrafficSources(sourceData);
        } catch (Exception ex) {
            warnings.add("Не удалось загрузить источники трафика.");
        }

        String message = warnings.isEmpty()
            ? "Данные Яндекс Метрики загружены."
            : "Данные Яндекс Метрики загружены частично.";

        return EventTrafficReport.builder()
            .pageViews(pageViews)
            .uniqueVisitors(uniqueVisitors)
            .bounceRate(roundNullable(bounceRate))
            .pageDepth(roundNullable(pageDepth))
            .trafficSources(trafficSources)
            .visitsByDay(visitsByDay)
            .status(YandexMetrikaStatusResponse.builder()
                .enabled(true)
                .configured(true)
                .available(true)
                .message(message)
                .warnings(List.copyOf(warnings))
                .build())
            .build();
    }

    private JsonNode requestData(String metrics,
                                 String dimensions,
                                 String sort,
                                 String filters,
                                 LocalDate fromDate,
                                 LocalDate toDate,
                                 Integer limit) {
        String uri = UriComponentsBuilder
            .fromPath("/stat/v1/data")
            .queryParam("ids", properties.getCounterId())
            .queryParam("metrics", metrics)
            .queryParam("date1", DATE_FORMATTER.format(fromDate))
            .queryParam("date2", DATE_FORMATTER.format(toDate))
            .queryParam("accuracy", "full")
            .queryParam("lang", "ru")
            .queryParamIfPresent("dimensions", StringUtils.hasText(dimensions) ? java.util.Optional.of(dimensions) : java.util.Optional.empty())
            .queryParamIfPresent("sort", StringUtils.hasText(sort) ? java.util.Optional.of(sort) : java.util.Optional.empty())
            .queryParamIfPresent("filters", StringUtils.hasText(filters) ? java.util.Optional.of(filters) : java.util.Optional.empty())
            .queryParamIfPresent("limit", limit == null ? java.util.Optional.empty() : java.util.Optional.of(limit))
            .build()
            .encode()
            .toUriString();

        JsonNode body = restClient.get()
            .uri(uri)
            .header(HttpHeaders.AUTHORIZATION, "OAuth " + properties.getToken())
            .retrieve()
            .body(JsonNode.class);

        return body == null ? JsonNodeFactoryHolder.emptyObject() : body;
    }

    private List<AnalyticsDatePointResponse> parseDateSeries(JsonNode response) {
        JsonNode rows = response.path("data");
        if (!rows.isArray() || rows.isEmpty()) {
            return List.of();
        }

        List<AnalyticsDatePointResponse> result = new ArrayList<>();
        for (JsonNode row : rows) {
            JsonNode dimensions = row.path("dimensions");
            JsonNode metrics = row.path("metrics");

            if (!dimensions.isArray() || dimensions.isEmpty() || !metrics.isArray() || metrics.isEmpty()) {
                continue;
            }

            String dateRaw = dimensions.get(0).path("name").asText("").trim();
            if (!StringUtils.hasText(dateRaw)) {
                continue;
            }

            LocalDate date;
            try {
                date = LocalDate.parse(dateRaw, DATE_FORMATTER);
            } catch (Exception ex) {
                continue;
            }

            long value = readLongFromArray(metrics, 0);
            result.add(AnalyticsDatePointResponse.builder()
                .date(date)
                .value(value)
                .build());
        }

        return result;
    }

    private List<AnalyticsTrafficSourceResponse> parseTrafficSources(JsonNode response) {
        JsonNode rows = response.path("data");
        if (!rows.isArray() || rows.isEmpty()) {
            return List.of();
        }

        long totalVisits = 0;
        List<SourceRow> sourceRows = new ArrayList<>();

        for (JsonNode row : rows) {
            JsonNode dimensions = row.path("dimensions");
            JsonNode metrics = row.path("metrics");

            if (!metrics.isArray() || metrics.isEmpty()) {
                continue;
            }

            String sourceName = "Не определено";
            if (dimensions.isArray() && !dimensions.isEmpty()) {
                String name = dimensions.get(0).path("name").asText("").trim();
                if (StringUtils.hasText(name)) {
                    sourceName = name;
                }
            }

            long visits = readLongFromArray(metrics, 0);
            totalVisits += visits;
            sourceRows.add(new SourceRow(sourceName, visits));
        }

        if (sourceRows.isEmpty()) {
            return List.of();
        }

        List<AnalyticsTrafficSourceResponse> result = new ArrayList<>();
        for (SourceRow sourceRow : sourceRows) {
            double share = totalVisits > 0 ? (sourceRow.visits * 100.0d / totalVisits) : 0.0d;
            result.add(AnalyticsTrafficSourceResponse.builder()
                .source(sourceRow.name)
                .visits(sourceRow.visits)
                .sharePercent(roundDouble(share))
                .build());
        }

        return result;
    }

    private String buildStartPathFilter(String eventPath) {
        String safePath = StringUtils.hasText(eventPath) ? eventPath.trim() : "/";
        String escaped = safePath.replace("'", "\\'");
        return "ym:s:startURLPath=='" + escaped + "'";
    }

    private long readLongFromArray(JsonNode arrayNode, int index) {
        if (!arrayNode.isArray() || index < 0 || index >= arrayNode.size()) {
            return 0L;
        }
        return Math.round(arrayNode.get(index).asDouble(0.0d));
    }

    private Double readDoubleFromArrayOrNull(JsonNode arrayNode, int index) {
        if (!arrayNode.isArray() || index < 0 || index >= arrayNode.size()) {
            return null;
        }
        return arrayNode.get(index).asDouble(0.0d);
    }

    private Double roundNullable(Double value) {
        if (value == null) {
            return null;
        }
        return roundDouble(value);
    }

    private double roundDouble(double value) {
        return Math.round(value * 10.0d) / 10.0d;
    }

    @Getter
    @Builder
    public static class EventTrafficReport {
        private long pageViews;
        private long uniqueVisitors;
        private Double bounceRate;
        private Double pageDepth;
        private List<AnalyticsTrafficSourceResponse> trafficSources;
        private List<AnalyticsDatePointResponse> visitsByDay;
        private YandexMetrikaStatusResponse status;
    }

    private record SourceRow(String name, long visits) {
    }

    private static final class JsonNodeFactoryHolder {
        private static final com.fasterxml.jackson.databind.node.JsonNodeFactory FACTORY = com.fasterxml.jackson.databind.node.JsonNodeFactory.instance;

        private JsonNodeFactoryHolder() {
        }

        private static JsonNode emptyObject() {
            return FACTORY.objectNode();
        }
    }
}

package com.festivalapp.backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(ResourceNotFoundException ex) {
        return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<Map<String, Object>> handleBadRequest(BadRequestException ex) {
        return buildResponse(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<Map<String, Object>> handleUnauthorized(UnauthorizedException ex) {
        return buildResponse(HttpStatus.UNAUTHORIZED, ex.getMessage());
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(AccessDeniedException ex) {
        return buildResponse(HttpStatus.FORBIDDEN, ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new LinkedHashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            errors.put(error.getField(), error.getDefaultMessage());
        }

        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("status", HttpStatus.BAD_REQUEST.value());
        body.put("error", "Проверьте корректность заполнения полей");
        body.put("message", "Проверьте корректность заполнения полей");
        body.put("details", errors);
        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<Map<String, Object>> handleMissingParam(MissingServletRequestParameterException ex) {
        return buildResponse(HttpStatus.BAD_REQUEST, "Отсутствует обязательный параметр: " + ex.getParameterName());
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        return buildResponse(HttpStatus.BAD_REQUEST, "Некорректное значение параметра: " + ex.getName());
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrity(DataIntegrityViolationException ex) {
        String rootCauseMessage = ex.getMostSpecificCause() != null
            ? ex.getMostSpecificCause().getMessage()
            : ex.getMessage();
        String normalized = rootCauseMessage == null ? "" : rootCauseMessage.toLowerCase();

        if (normalized.contains("registrations")) {
            return buildResponse(HttpStatus.BAD_REQUEST, "Не удалось создать регистрацию");
        }
        if (normalized.contains("event_categories_category_id_fkey")) {
            return buildResponse(HttpStatus.BAD_REQUEST, "Нельзя удалить категорию: она используется в мероприятиях");
        }
        if (normalized.contains("events_venue_id_fkey")) {
            return buildResponse(HttpStatus.BAD_REQUEST, "Нельзя удалить площадку: она используется в мероприятиях");
        }
        if (normalized.contains("venues_city_id_fkey")) {
            return buildResponse(HttpStatus.BAD_REQUEST, "Нельзя удалить город: в нем есть связанные площадки");
        }
        if (normalized.contains("publications_event_id_fkey")) {
            return buildResponse(HttpStatus.BAD_REQUEST, "Нельзя сохранить публикацию: связанное мероприятие не найдено");
        }
        if (normalized.contains("publications_author_id_fkey")) {
            return buildResponse(HttpStatus.BAD_REQUEST, "Нельзя сохранить публикацию: автор не найден");
        }
        if (normalized.contains("foreign key") && normalized.contains("publications") && normalized.contains("event_id")) {
            return buildResponse(HttpStatus.BAD_REQUEST, "Нельзя сохранить публикацию: связанное мероприятие не найдено");
        }
        if (normalized.contains("foreign key") && normalized.contains("publications") && normalized.contains("author_id")) {
            return buildResponse(HttpStatus.BAD_REQUEST, "Нельзя сохранить публикацию: автор не найден");
        }
        if (normalized.contains("events_organizer_id_fkey")) {
            return buildResponse(HttpStatus.BAD_REQUEST, "Нельзя сохранить мероприятие: организатор не найден");
        }
        if (normalized.contains("users_login_key")
            || normalized.contains("users.login")
            || (normalized.contains("duplicate key") && normalized.contains("login"))) {
            return buildResponse(HttpStatus.BAD_REQUEST, "Логин уже занят");
        }
        if (normalized.contains("users_email_key")
            || normalized.contains("users.email")
            || (normalized.contains("duplicate key") && normalized.contains("email"))) {
            return buildResponse(HttpStatus.BAD_REQUEST, "Электронная почта уже используется");
        }
        if (normalized.contains("users_phone_key")
            || normalized.contains("users.phone")
            || (normalized.contains("duplicate key") && normalized.contains("phone"))) {
            return buildResponse(HttpStatus.BAD_REQUEST, "Пользователь с таким номером телефона уже существует");
        }
        if (normalized.contains("events_status_check")) {
            return buildResponse(HttpStatus.BAD_REQUEST, "Не удалось сохранить мероприятие: некорректный статус");
        }
        if (normalized.contains("publications_status_check")) {
            return buildResponse(HttpStatus.BAD_REQUEST, "Не удалось сохранить публикацию: обновите страницу и попробуйте снова");
        }
        if (normalized.contains("publications")) {
            return buildResponse(HttpStatus.BAD_REQUEST, "Не удалось сохранить публикацию. Проверьте выбранное мероприятие и заполненные поля.");
        }
        return buildResponse(HttpStatus.BAD_REQUEST, "Операция не выполнена: данные связаны с другими записями.");
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, Object>> handleMaxUploadSize(MaxUploadSizeExceededException ex) {
        return buildResponse(HttpStatus.BAD_REQUEST, "Размер файла превышает допустимый лимит");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleOther(Exception ex) {
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "Внутренняя ошибка сервера");
    }

    private ResponseEntity<Map<String, Object>> buildResponse(HttpStatus status, String message) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("status", status.value());
        body.put("error", message);
        return ResponseEntity.status(status).body(body);
    }
}

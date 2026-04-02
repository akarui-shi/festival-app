package com.festivalapp.backend.service;

import com.festivalapp.backend.entity.StoredFile;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.exception.ResourceNotFoundException;
import com.festivalapp.backend.repository.StoredFileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FileStorageService {

    private static final Set<String> ALLOWED_IMAGE_CONTENT_TYPES = Set.of(
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif"
    );

    @Value("${app.upload.max-file-size-bytes:5242880}")
    private long maxFileSizeBytes;

    private final StoredFileRepository storedFileRepository;

    public StoredFile storeEventCover(MultipartFile file) {
        return storeImage(file, "EVENT_COVER");
    }

    public StoredFile storeEventImage(MultipartFile file) {
        return storeImage(file, "EVENT_IMAGE");
    }

    public StoredFile storePublicationImage(MultipartFile file) {
        return storeImage(file, "PUBLICATION_IMAGE");
    }

    public StoredFile loadById(Long id) {
        return storedFileRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Файл не найден"));
    }

    private StoredFile storeImage(MultipartFile file, String purpose) {
        validateImage(file);

        String contentType = normalizeContentType(file.getContentType());
        String extension = resolveExtension(file.getOriginalFilename(), contentType);
        String storedFileName = UUID.randomUUID() + extension;

        byte[] fileBytes;
        try {
            fileBytes = file.getBytes();
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to read uploaded file", ex);
        }

        StoredFile storedFile = StoredFile.builder()
            .fileName(storedFileName)
            .contentType(contentType)
            .size(file.getSize())
            .purpose(purpose)
            .fileData(fileBytes)
            .build();
        return storedFileRepository.save(storedFile);
    }

    private void validateImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File is required");
        }

        if (file.getSize() > maxFileSizeBytes) {
            throw new BadRequestException("File size is too large");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_IMAGE_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new BadRequestException("Only image files are allowed");
        }
    }

    private String normalizeContentType(String contentType) {
        return contentType == null ? "application/octet-stream" : contentType.toLowerCase(Locale.ROOT);
    }

    private String resolveExtension(String originalFileName, String contentType) {
        if (originalFileName != null) {
            int dotIndex = originalFileName.lastIndexOf('.');
            if (dotIndex >= 0 && dotIndex < originalFileName.length() - 1) {
                String rawExtension = originalFileName.substring(dotIndex + 1);
                String normalized = rawExtension.replaceAll("[^A-Za-z0-9]", "").toLowerCase(Locale.ROOT);
                if (!normalized.isBlank()) {
                    return "." + normalized;
                }
            }
        }

        if (contentType == null) {
            return ".img";
        }

        return switch (contentType.toLowerCase(Locale.ROOT)) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            case "image/gif" -> ".gif";
            default -> ".img";
        };
    }
}

package com.festivalapp.backend.service;

import com.festivalapp.backend.exception.BadRequestException;
import jakarta.annotation.PostConstruct;
import lombok.Builder;
import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class FileStorageService {

    private static final Set<String> ALLOWED_IMAGE_CONTENT_TYPES = Set.of(
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif"
    );

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @Value("${app.upload.max-file-size-bytes:5242880}")
    private long maxFileSizeBytes;

    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(resolveUploadRoot());
            Files.createDirectories(resolveEventImagesDirectory());
            Files.createDirectories(resolvePublicationImagesDirectory());
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to initialize upload directories", ex);
        }
    }

    public StoredFile storeEventCover(MultipartFile file) {
        return storeImage(file, resolveEventImagesDirectory(), "/uploads/events/");
    }

    public StoredFile storeEventImage(MultipartFile file) {
        return storeImage(file, resolveEventImagesDirectory(), "/uploads/events/");
    }

    public StoredFile storePublicationImage(MultipartFile file) {
        return storeImage(file, resolvePublicationImagesDirectory(), "/uploads/publications/");
    }

    private StoredFile storeImage(MultipartFile file, Path targetDirectory, String relativeDirectoryPath) {
        validateImage(file);

        String extension = resolveExtension(file.getOriginalFilename(), file.getContentType());
        String fileName = UUID.randomUUID() + extension;

        Path target = targetDirectory.resolve(fileName).normalize();
        try {
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to store uploaded file", ex);
        }

        return StoredFile.builder()
            .fileName(fileName)
            .relativePath(relativeDirectoryPath + fileName)
            .size(file.getSize())
            .contentType(file.getContentType())
            .build();
    }

    public Path resolveUploadRoot() {
        return Path.of(uploadDir).toAbsolutePath().normalize();
    }

    private Path resolveEventImagesDirectory() {
        return resolveUploadRoot().resolve("events").normalize();
    }

    private Path resolvePublicationImagesDirectory() {
        return resolveUploadRoot().resolve("publications").normalize();
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

    @Getter
    @Builder
    public static class StoredFile {
        private String fileName;
        private String relativePath;
        private long size;
        private String contentType;
    }
}

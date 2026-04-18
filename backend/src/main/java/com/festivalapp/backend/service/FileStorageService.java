package com.festivalapp.backend.service;

import com.festivalapp.backend.entity.Image;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.exception.ResourceNotFoundException;
import com.festivalapp.backend.repository.ImageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.OffsetDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FileStorageService {

    private final ImageRepository imageRepository;

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @Transactional
    public Image storeEventCover(MultipartFile file) {
        return store(file, "event-cover");
    }

    @Transactional
    public Image storeEventImage(MultipartFile file) {
        return store(file, "event-image");
    }

    @Transactional
    public Image storePublicationImage(MultipartFile file) {
        return store(file, "publication-image");
    }

    @Transactional
    public Image storeAvatar(MultipartFile file) {
        return store(file, "avatar");
    }

    @Transactional(readOnly = true)
    public StoredImageContent loadById(Long id) {
        Image image = imageRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("File not found"));

        Path path = resolveStoragePath(image.getFileName());
        byte[] bytes;
        try {
            bytes = Files.readAllBytes(path);
        } catch (IOException ex) {
            throw new ResourceNotFoundException("File bytes are missing");
        }

        return new StoredImageContent(image, bytes);
    }

    private Image store(MultipartFile file, String prefix) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Файл пустой");
        }

        String originalName = StringUtils.hasText(file.getOriginalFilename())
            ? file.getOriginalFilename().trim()
            : "file.bin";

        String storedName = prefix + "-" + UUID.randomUUID() + extensionOf(originalName);
        Path target = resolveStoragePath(storedName);

        try {
            Files.createDirectories(target.getParent());
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException ex) {
            throw new IllegalStateException("Не удалось сохранить файл", ex);
        }

        Image image = Image.builder()
            .fileName(storedName)
            .mimeType(file.getContentType() == null ? "application/octet-stream" : file.getContentType())
            .fileSize(file.getSize())
            .fileUrl("/api/files/" + storedName)
            .uploadedAt(OffsetDateTime.now())
            .build();

        return imageRepository.save(image);
    }

    private Path resolveStoragePath(String fileName) {
        Path base = Paths.get(uploadDir);
        if (!base.isAbsolute()) {
            base = Paths.get(System.getProperty("user.dir")).resolve(base);
        }
        return base.resolve(fileName).normalize();
    }

    private String extensionOf(String fileName) {
        int dotIndex = fileName.lastIndexOf('.');
        if (dotIndex < 0 || dotIndex == fileName.length() - 1) {
            return "";
        }
        String ext = fileName.substring(dotIndex);
        return ext.length() > 12 ? "" : ext;
    }

    public record StoredImageContent(Image image, byte[] bytes) {
    }
}

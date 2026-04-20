package com.festivalapp.backend.service;

import com.festivalapp.backend.entity.Image;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.exception.ResourceNotFoundException;
import com.festivalapp.backend.repository.ImageRepository;
import com.festivalapp.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.OffsetDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FileStorageService {

    private final ImageRepository imageRepository;
    private final UserRepository userRepository;

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @Value("${app.upload.max-file-size-bytes:5242880}")
    private long maxFileSizeBytes;

    @Transactional
    public Image storeEventCover(MultipartFile file) {
        return store(file, "event-cover", null);
    }

    @Transactional
    public Image storeEventCover(MultipartFile file, String actorIdentifier) {
        return store(file, "event-cover", actorIdentifier);
    }

    @Transactional
    public Image storeEventImage(MultipartFile file) {
        return store(file, "event-image", null);
    }

    @Transactional
    public Image storeEventImage(MultipartFile file, String actorIdentifier) {
        return store(file, "event-image", actorIdentifier);
    }

    @Transactional
    public Image storePublicationImage(MultipartFile file) {
        return store(file, "publication-image", null);
    }

    @Transactional
    public Image storePublicationImage(MultipartFile file, String actorIdentifier) {
        return store(file, "publication-image", actorIdentifier);
    }

    @Transactional
    public Image storeAvatar(MultipartFile file) {
        return store(file, "avatar", null);
    }

    @Transactional
    public Image storeAvatar(MultipartFile file, String actorIdentifier) {
        return store(file, "avatar", actorIdentifier);
    }

    @Transactional(readOnly = true)
    public StoredImageContent loadById(Long id) {
        Image image = imageRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("File not found"));

        if (image.getFileData() != null && image.getFileData().length > 0) {
            return new StoredImageContent(image, image.getFileData());
        }

        byte[] fallback = loadFromLegacyStorage(image.getFileName());
        if (fallback != null) {
            return new StoredImageContent(image, fallback);
        }

        throw new ResourceNotFoundException("File bytes are missing");
    }

    private Image store(MultipartFile file, String prefix, String actorIdentifier) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Файл пустой");
        }
        if (file.getSize() > maxFileSizeBytes) {
            throw new BadRequestException("Файл превышает допустимый размер");
        }

        String originalName = StringUtils.hasText(file.getOriginalFilename())
            ? file.getOriginalFilename().trim()
            : "file.bin";

        String storedName = prefix + "-" + UUID.randomUUID() + extensionOf(originalName);
        byte[] fileBytes = readBytes(file);
        ImageDimensions dimensions = detectDimensions(fileBytes);

        Image image = Image.builder()
            .fileName(storedName)
            .mimeType(file.getContentType() == null ? "application/octet-stream" : file.getContentType())
            .fileSize(file.getSize())
            .fileData(fileBytes)
            .width(dimensions.width())
            .height(dimensions.height())
            .uploadedAt(OffsetDateTime.now())
            .uploadedByUser(resolveUploader(actorIdentifier))
            .build();

        return imageRepository.save(image);
    }

    private byte[] readBytes(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException ex) {
            throw new IllegalStateException("Не удалось прочитать файл", ex);
        }
    }

    private ImageDimensions detectDimensions(byte[] fileBytes) {
        try {
            BufferedImage bufferedImage = ImageIO.read(new ByteArrayInputStream(fileBytes));
            if (bufferedImage == null) {
                return new ImageDimensions(null, null);
            }
            return new ImageDimensions(bufferedImage.getWidth(), bufferedImage.getHeight());
        } catch (IOException ignored) {
            return new ImageDimensions(null, null);
        }
    }

    private com.festivalapp.backend.entity.User resolveUploader(String actorIdentifier) {
        if (!StringUtils.hasText(actorIdentifier)) {
            return null;
        }
        return userRepository.findByLoginOrEmailWithRoles(actorIdentifier).orElse(null);
    }

    private byte[] loadFromLegacyStorage(String fileName) {
        if (!StringUtils.hasText(fileName)) {
            return null;
        }
        Path path = resolveStoragePath(fileName);
        if (!Files.exists(path)) {
            return null;
        }
        try {
            return Files.readAllBytes(path);
        } catch (IOException ex) {
            return null;
        }
    }

    private record ImageDimensions(Integer width, Integer height) {
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

package com.festivalapp.backend.service;

import com.festivalapp.backend.entity.Image;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.repository.ImageRepository;
import com.festivalapp.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.atLeast;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FileStorageServiceTest {

    @Mock
    private ImageRepository imageRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private FileStorageService fileStorageService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(fileStorageService, "maxFileSizeBytes", 5_242_880L);
        ReflectionTestUtils.setField(fileStorageService, "uploadDir", "uploads");
    }

    @Test
    void storeEventImage_savesBinaryIntoDatabase() {
        User uploader = User.builder().id(7L).login("org").build();
        when(userRepository.findByLoginOrEmailWithRoles(eq("org"))).thenReturn(Optional.of(uploader));

        AtomicLong ids = new AtomicLong(100);
        when(imageRepository.save(any(Image.class))).thenAnswer(invocation -> {
            Image image = invocation.getArgument(0);
            if (image.getId() == null) {
                image.setId(ids.incrementAndGet());
            }
            if (image.getUploadedAt() == null) {
                image.setUploadedAt(OffsetDateTime.now());
            }
            return image;
        });

        MockMultipartFile file = new MockMultipartFile(
            "file",
            "poster.png",
            "image/png",
            "test-image-content".getBytes()
        );

        Image saved = fileStorageService.storeEventImage(file, "org");

        ArgumentCaptor<Image> imageCaptor = ArgumentCaptor.forClass(Image.class);
        verify(imageRepository, atLeast(2)).save(imageCaptor.capture());
        List<Image> allSaved = imageCaptor.getAllValues();
        Image firstSave = allSaved.get(0);

        assertThat(firstSave.getFileData()).isNotNull();
        assertThat(firstSave.getFileData().length).isGreaterThan(0);
        assertThat(firstSave.getMimeType()).isEqualTo("image/png");
        assertThat(firstSave.getUploadedByUser()).isNotNull();
    }

    @Test
    void loadById_readsBytesFromDatabaseBlob() {
        Image image = Image.builder()
            .id(55L)
            .fileName("image.png")
            .mimeType("image/png")
            .fileSize(4L)
            .fileData(new byte[]{1, 2, 3, 4})
            .uploadedAt(OffsetDateTime.now())
            .build();
        when(imageRepository.findById(55L)).thenReturn(Optional.of(image));

        FileStorageService.StoredImageContent content = fileStorageService.loadById(55L);

        assertThat(content.image().getId()).isEqualTo(55L);
        assertThat(content.bytes()).containsExactly(1, 2, 3, 4);
    }
}

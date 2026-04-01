package com.festivalapp.backend.controller;

import com.festivalapp.backend.dto.FileUploadResponse;
import com.festivalapp.backend.service.FileStorageService;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileUploadController {

    private final FileStorageService fileStorageService;

    @PostMapping(value = "/event-cover", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<FileUploadResponse> uploadEventCover(@RequestPart("file") @NotNull MultipartFile file) {
        FileStorageService.StoredFile storedFile = fileStorageService.storeEventCover(file);
        return buildUploadResponse(storedFile);
    }

    @PostMapping(value = "/event-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<FileUploadResponse> uploadEventImage(@RequestPart("file") @NotNull MultipartFile file) {
        FileStorageService.StoredFile storedFile = fileStorageService.storeEventImage(file);
        return buildUploadResponse(storedFile);
    }

    @PostMapping(value = "/publication-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<FileUploadResponse> uploadPublicationImage(@RequestPart("file") @NotNull MultipartFile file) {
        FileStorageService.StoredFile storedFile = fileStorageService.storePublicationImage(file);
        return buildUploadResponse(storedFile);
    }

    private ResponseEntity<FileUploadResponse> buildUploadResponse(FileStorageService.StoredFile storedFile) {
        String fileUrl = ServletUriComponentsBuilder.fromCurrentContextPath()
            .path(storedFile.getRelativePath())
            .toUriString();

        FileUploadResponse response = FileUploadResponse.builder()
            .fileName(storedFile.getFileName())
            .relativePath(storedFile.getRelativePath())
            .url(fileUrl)
            .size(storedFile.getSize())
            .contentType(storedFile.getContentType())
            .build();

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}

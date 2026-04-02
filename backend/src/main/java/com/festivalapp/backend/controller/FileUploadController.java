package com.festivalapp.backend.controller;

import com.festivalapp.backend.dto.FileUploadResponse;
import com.festivalapp.backend.entity.StoredFile;
import com.festivalapp.backend.service.FileStorageService;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ContentDisposition;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
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
        StoredFile storedFile = fileStorageService.storeEventCover(file);
        return buildUploadResponse(storedFile);
    }

    @PostMapping(value = "/event-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<FileUploadResponse> uploadEventImage(@RequestPart("file") @NotNull MultipartFile file) {
        StoredFile storedFile = fileStorageService.storeEventImage(file);
        return buildUploadResponse(storedFile);
    }

    @PostMapping(value = "/publication-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<FileUploadResponse> uploadPublicationImage(@RequestPart("file") @NotNull MultipartFile file) {
        StoredFile storedFile = fileStorageService.storePublicationImage(file);
        return buildUploadResponse(storedFile);
    }

    @GetMapping("/{id}")
    public ResponseEntity<byte[]> getFile(@PathVariable Long id) {
        StoredFile file = fileStorageService.loadById(id);
        MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
        if (file.getContentType() != null) {
            mediaType = MediaType.parseMediaType(file.getContentType());
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(mediaType);
        headers.setContentLength(file.getSize() == null ? file.getFileData().length : file.getSize());
        headers.setContentDisposition(ContentDisposition.inline().filename(file.getFileName()).build());

        return ResponseEntity.ok()
            .headers(headers)
            .body(file.getFileData());
    }

    private ResponseEntity<FileUploadResponse> buildUploadResponse(StoredFile storedFile) {
        String relativePath = "/api/files/" + storedFile.getId();
        String fileUrl = ServletUriComponentsBuilder.fromCurrentContextPath()
            .path(relativePath)
            .toUriString();

        FileUploadResponse response = FileUploadResponse.builder()
            .fileName(storedFile.getFileName())
            .relativePath(relativePath)
            .url(fileUrl)
            .size(storedFile.getSize() == null ? 0L : storedFile.getSize())
            .contentType(storedFile.getContentType())
            .build();

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}

package com.festivalapp.backend.controller;

import com.festivalapp.backend.dto.FileUploadResponse;
import com.festivalapp.backend.entity.Image;
import com.festivalapp.backend.service.FileStorageService;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileUploadController {

    private final FileStorageService fileStorageService;

    @PostMapping(value = "/event-cover", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<FileUploadResponse> uploadEventCover(@RequestPart("file") @NotNull MultipartFile file,
                                                               @AuthenticationPrincipal UserDetails principal) {
        Image image = fileStorageService.storeEventCover(file, principal == null ? null : principal.getUsername());
        return buildUploadResponse(image);
    }

    @PostMapping(value = "/event-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<FileUploadResponse> uploadEventImage(@RequestPart("file") @NotNull MultipartFile file,
                                                               @AuthenticationPrincipal UserDetails principal) {
        Image image = fileStorageService.storeEventImage(file, principal == null ? null : principal.getUsername());
        return buildUploadResponse(image);
    }

    @PostMapping(value = "/publication-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<FileUploadResponse> uploadPublicationImage(@RequestPart("file") @NotNull MultipartFile file,
                                                                     @AuthenticationPrincipal UserDetails principal) {
        Image image = fileStorageService.storePublicationImage(file, principal == null ? null : principal.getUsername());
        return buildUploadResponse(image);
    }

    @PostMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<FileUploadResponse> uploadAvatar(@RequestPart("file") @NotNull MultipartFile file,
                                                           @AuthenticationPrincipal UserDetails principal) {
        Image image = fileStorageService.storeAvatar(file, principal == null ? null : principal.getUsername());
        return buildUploadResponse(image);
    }

    @PostMapping(value = "/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<FileUploadResponse> uploadGenericImage(@RequestPart("file") @NotNull MultipartFile file,
                                                                 @AuthenticationPrincipal UserDetails principal) {
        Image image = fileStorageService.storeEventImage(file, principal == null ? null : principal.getUsername());
        return buildUploadResponse(image);
    }

    @GetMapping("/{id}")
    public ResponseEntity<byte[]> getFile(@PathVariable Long id) {
        FileStorageService.StoredImageContent stored = fileStorageService.loadById(id);
        Image image = stored.image();

        MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
        if (image.getMimeType() != null) {
            mediaType = MediaType.parseMediaType(image.getMimeType());
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(mediaType);
        headers.setContentLength(image.getFileSize() == null ? stored.bytes().length : image.getFileSize());
        headers.setContentDisposition(ContentDisposition.inline().filename(image.getFileName()).build());

        return ResponseEntity.ok()
            .headers(headers)
            .body(stored.bytes());
    }

    private ResponseEntity<FileUploadResponse> buildUploadResponse(Image image) {
        FileUploadResponse response = FileUploadResponse.builder()
            .imageId(image.getId())
            .fileName(image.getFileName())
            .size(image.getFileSize() == null ? 0L : image.getFileSize())
            .contentType(image.getMimeType())
            .build();

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}

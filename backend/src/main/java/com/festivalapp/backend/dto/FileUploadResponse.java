package com.festivalapp.backend.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class FileUploadResponse {

    private Long imageId;
    private String fileName;
    private String relativePath;
    private String url;
    private long size;
    private String contentType;
}

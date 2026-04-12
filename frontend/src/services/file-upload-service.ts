import { apiPost } from './api-client';

interface FileUploadResponse {
  fileName: string;
  relativePath: string;
  url: string;
  size: number;
  contentType: string;
}

async function uploadFile(endpoint: string, file: File): Promise<FileUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  return apiPost<FileUploadResponse>(endpoint, formData);
}

export const fileUploadService = {
  uploadEventCover(file: File): Promise<FileUploadResponse> {
    return uploadFile('/files/event-cover', file);
  },

  uploadEventImage(file: File): Promise<FileUploadResponse> {
    return uploadFile('/files/event-image', file);
  },

  uploadPublicationImage(file: File): Promise<FileUploadResponse> {
    return uploadFile('/files/publication-image', file);
  },
};

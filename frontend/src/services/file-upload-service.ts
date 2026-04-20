import { apiPost } from './api-client';

interface FileUploadResponse {
  imageId: number;
  fileName: string;
  size: number;
  contentType: string;
}

async function uploadFile(endpoint: string, file: File): Promise<FileUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  return apiPost<FileUploadResponse>(endpoint, formData);
}

export const fileUploadService = {
  uploadImage(file: File): Promise<FileUploadResponse> {
    return uploadFile('/files/image', file);
  },

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

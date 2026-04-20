export function imageSrc(imageId?: number | null, fallback = '/placeholder.svg'): string {
  if (imageId == null) {
    return fallback;
  }
  return `/api/files/${imageId}`;
}

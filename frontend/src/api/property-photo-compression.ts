import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export const PROPERTY_PHOTO_MAX_DIMENSION = 2048;
export const PROPERTY_PHOTO_JPEG_QUALITY = 0.82;

/** Re-encodes picker output as a bounded JPEG so HEIC and large originals upload consistently. */
export async function compressPropertyPhoto(uri: string, width: number, height: number) {
  const context = ImageManipulator.manipulate(uri);
  let image: Awaited<ReturnType<typeof context.renderAsync>> | undefined;
  try {
    if (width > PROPERTY_PHOTO_MAX_DIMENSION || height > PROPERTY_PHOTO_MAX_DIMENSION) {
      if (width >= height) context.resize({ width: PROPERTY_PHOTO_MAX_DIMENSION });
      else context.resize({ height: PROPERTY_PHOTO_MAX_DIMENSION });
    }
    image = await context.renderAsync();
    return await image.saveAsync({ format: SaveFormat.JPEG, compress: PROPERTY_PHOTO_JPEG_QUALITY });
  } finally {
    image?.release();
    context.release();
  }
}

export function compressedPropertyPhotoFilename(filename: string | null | undefined, index: number): string {
  const basename = filename?.trim().replace(/\.[^/.]+$/, '') || `property-photo-${index + 1}`;
  return `${basename.slice(0, 251)}.jpg`;
}

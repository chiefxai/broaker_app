import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { compressPropertyPhoto, compressedPropertyPhotoFilename } from '@/api/property-photo-compression';

describe('property photo preparation', () => {
  const saveAsync = jest.fn(async (_options: { format: SaveFormat; compress: number }) => ({ uri: 'file:///compressed.jpg', width: 2048, height: 1365 }));
  const resize = jest.fn((_size: { width?: number | null; height?: number | null }): unknown => undefined);
  const releaseImage = jest.fn();
  const releaseContext = jest.fn();
  const renderAsync = jest.fn(async () => ({ saveAsync, release: releaseImage }));
  const context = { resize, renderAsync, release: releaseContext };

  beforeEach(() => {
    jest.clearAllMocks();
    resize.mockImplementation(() => context);
    jest.mocked(ImageManipulator.manipulate).mockReturnValue(context as unknown as ReturnType<typeof ImageManipulator.manipulate>);
  });

  it('resizes landscape originals and re-encodes as compressed JPEG', async () => {
    await expect(compressPropertyPhoto('file:///large.heic', 4032, 3024)).resolves.toEqual({
      uri: 'file:///compressed.jpg', width: 2048, height: 1365,
    });
    expect(ImageManipulator.manipulate).toHaveBeenCalledWith('file:///large.heic');
    expect(resize).toHaveBeenCalledWith({ width: 2048 });
    expect(saveAsync).toHaveBeenCalledWith({ format: SaveFormat.JPEG, compress: 0.82 });
    expect(releaseImage).toHaveBeenCalledTimes(1);
    expect(releaseContext).toHaveBeenCalledTimes(1);
  });

  it('resizes portrait images by height and leaves small images at their original dimensions', async () => {
    await compressPropertyPhoto('file:///portrait.png', 1200, 3000);
    expect(resize).toHaveBeenCalledWith({ height: 2048 });

    jest.clearAllMocks();
    resize.mockImplementation(() => context);
    jest.mocked(ImageManipulator.manipulate).mockReturnValue(context as unknown as ReturnType<typeof ImageManipulator.manipulate>);
    await compressPropertyPhoto('file:///small.jpg', 1200, 800);
    expect(resize).not.toHaveBeenCalled();
    expect(saveAsync).toHaveBeenCalledWith({ format: SaveFormat.JPEG, compress: 0.82 });
  });

  it('normalizes source names to a bounded JPEG filename', () => {
    expect(compressedPropertyPhotoFilename('site-map.HEIC', 0)).toBe('site-map.jpg');
    expect(compressedPropertyPhotoFilename(null, 2)).toBe('property-photo-3.jpg');
    expect(compressedPropertyPhotoFilename(`${'a'.repeat(260)}.png`, 0)).toHaveLength(255);
  });
});

jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: { manipulate: jest.fn() },
  SaveFormat: { JPEG: 'jpeg' },
}));

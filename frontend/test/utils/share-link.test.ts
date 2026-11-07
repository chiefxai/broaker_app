import { jest } from '@jest/globals';
import * as Clipboard from 'expo-clipboard';
import { Share } from 'react-native';

import { shareOrCopyUrl } from '@/utils/share-link';

describe('shareOrCopyUrl', () => {
  afterEach(() => jest.restoreAllMocks());

  it('uses the native share API when it succeeds', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction, activityType: undefined });
    const copy = jest.spyOn(Clipboard, 'setStringAsync');

    await expect(shareOrCopyUrl('https://example.test/listing')).resolves.toBe('shared');
    expect(share).toHaveBeenCalledWith({ message: 'https://example.test/listing' });
    expect(copy).not.toHaveBeenCalled();
  });

  it('copies the URL when sharing is unsupported and reports when both are unavailable', async () => {
    jest.spyOn(Share, 'share').mockRejectedValue(new Error('Share is not supported in this browser'));
    const copy = jest.spyOn(Clipboard, 'setStringAsync').mockResolvedValue(true);

    await expect(shareOrCopyUrl('https://example.test/listing')).resolves.toBe('copied');
    expect(copy).toHaveBeenCalledWith('https://example.test/listing');

    copy.mockRejectedValue(new Error('Clipboard is unavailable'));
    await expect(shareOrCopyUrl('https://example.test/listing')).resolves.toBe('unavailable');
  });
});

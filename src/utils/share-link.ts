import * as Clipboard from 'expo-clipboard';
import { Share } from 'react-native';

export type ShareLinkResult = 'shared' | 'copied' | 'unavailable';

/** Shares a URL where supported and copies it when native/browser sharing is unavailable. */
export async function shareOrCopyUrl(url: string): Promise<ShareLinkResult> {
  try {
    await Share.share({ message: url });
    return 'shared';
  } catch {
    try {
      await Clipboard.setStringAsync(url);
      return 'copied';
    } catch {
      return 'unavailable';
    }
  }
}

import { Directory, File, Paths } from 'expo-file-system';
import * as Crypto from 'expo-crypto';

const localAssetDirectory = new Directory(Paths.document, 'broaker-pending-assets');

function safeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) || 'asset';
}

/** Copies picker/cache output into durable app storage before its URI is queued in SQLite. */
export async function keepLocalAsset(uri: string, filename: string): Promise<string> {
  localAssetDirectory.create({ idempotent: true, intermediates: true });
  const destination = new File(localAssetDirectory, `${Crypto.randomUUID()}-${safeFilename(filename)}`);
  await new File(uri).copy(destination);
  if (!destination.exists || destination.size === 0) throw new Error('The selected file could not be saved locally. Choose it again.');
  return destination.uri;
}

export async function removeLocalAssetFile(uri: string): Promise<void> {
  const file = new File(uri);
  if (file.exists) file.delete();
}

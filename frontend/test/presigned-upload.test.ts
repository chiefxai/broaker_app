import { afterEach, describe, expect, it, jest } from '@jest/globals';

import { PRESIGNED_UPLOAD_TIMEOUT_MS, uploadRawFileToPresignedUrl } from '@/api/presigned-upload';

jest.mock('expo/fetch', () => ({ fetch: (...args: Parameters<typeof fetch>) => globalThis.fetch(...args) }));

describe('presigned document upload', () => {
  afterEach(() => { jest.restoreAllMocks(); });

  it('PUTs the file bytes directly with the exact signed content type and no API bearer token', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 200 } as Response);
    const file = new Blob(['test document'], { type: 'application/pdf' });

    await expect(uploadRawFileToPresignedUrl('https://storage.example.test/signed-upload', 'application/pdf', file)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith('https://storage.example.test/signed-upload', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/pdf' },
      body: file,
      signal: expect.any(AbortSignal),
    });
  });

  it('PUTs M4A recording bytes with the exact audio/mp4 content type', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 200 } as Response);
    const file = new Blob(['recorded audio'], { type: 'audio/mp4' });

    await expect(uploadRawFileToPresignedUrl('https://storage.example.test/voice-upload', 'audio/mp4', file)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith('https://storage.example.test/voice-upload', {
      method: 'PUT',
      headers: { 'Content-Type': 'audio/mp4' },
      body: file,
      signal: expect.any(AbortSignal),
    });
  });

  it('fails cleanly when storage rejects the upload', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 403 } as Response);
    await expect(uploadRawFileToPresignedUrl('https://storage.example.test/expired', 'image/png', new Blob(['image']))).rejects.toThrow('File upload failed (403).');
  });

  it('explains unreachable storage instead of leaving the photo upload ambiguous', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(uploadRawFileToPresignedUrl('http://unreachable-storage/upload', 'image/jpeg', new Blob(['image'])))
      .rejects.toThrow('Could not reach file storage. Check the storage address and try again.');
  });

  it('aborts a storage request that never responds', async () => {
    jest.useFakeTimers();
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation((_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));
    const upload = uploadRawFileToPresignedUrl('https://storage.example.test/stalled', 'image/jpeg', new Blob(['image']));
    const rejection = expect(upload).rejects.toThrow('File upload timed out. Check the storage connection and try again.');
    await jest.advanceTimersByTimeAsync(PRESIGNED_UPLOAD_TIMEOUT_MS);
    await rejection;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});

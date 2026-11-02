import * as FileSystem from 'expo-file-system';
import { createApiClient } from '@pethouse/api-client';
import {
  contentTypeOf, MAX_PHOTO_BYTES, PhotoUploadError, uploadTankPhoto,
} from './upload-photo';

jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn(),
  uploadAsync: jest.fn(),
  FileSystemUploadType: { BINARY_CONTENT: 0 },
}));

const getInfo = jest.mocked(FileSystem.getInfoAsync);
const upload = jest.mocked(FileSystem.uploadAsync);

const PHOTO = {
  id: 7,
  url: 'http://storage.test/tanks/4/a.jpg',
  contentType: 'image/jpeg',
  sizeBytes: 1234,
  caption: null,
  takenAt: null,
  uploadedBy: {
    id: 1,
    displayName: 'Camille',
  },
  createdAt: '2026-11-02T08:00:00.000Z',
};

describe('contentTypeOf', () => {
  it.each([
    [{ uri: 'file:///a.jpg',
      mimeType: 'image/jpeg' }, 'image/jpeg'],
    [{ uri: 'file:///a',
      mimeType: 'image/jpg' }, 'image/jpeg'],
    [{ uri: 'file:///a.HEIC' }, 'image/heic'],
    [{ uri: 'file:///a.png?x=1' }, 'image/png'],
    [{ uri: 'file:///a.gif',
      mimeType: 'image/gif' }, null],
    [{ uri: 'file:///a.tiff' }, null],
    [{ uri: 'file:///a' }, null],
  ])('reads %p', (image, expected) => {
    expect(contentTypeOf(image)).toBe(expected);
  });
});

describe('uploadTankPhoto', () => {
  const calls: { method: string;
    path: string;
    body: unknown }[] = [];
  let failRegister = false;
  const api = createApiClient({
    baseUrl: 'http://api.test',
    fetch: async (request: Request) => {
      const path = new URL(request.url).pathname;
      calls.push({
        method: request.method,
        path,
        body: JSON.parse(await request.text()),
      });
      const body = path.endsWith('/upload-url')
        ? {
          uploadUrl: 'http://storage.test/put-here',
          method: 'PUT',
          storageKey: 'tanks/4/key.jpg',
          expiresAt: '2026-11-02T08:05:00.000Z',
        }
        : PHOTO;

      return new Response(JSON.stringify(body), {
        status: failRegister && !path.endsWith('/upload-url') ? 500 : 201,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    calls.length = 0;
    failRegister = false;
    getInfo.mockResolvedValue({
      exists: true,
      size: 1234,
      uri: 'file:///a.jpg',
      isDirectory: false,
      modificationTime: 0,
    });
    upload.mockResolvedValue({
      status: 200,
      body: '',
      headers: {},
      mimeType: null,
    });
  });

  it('asks for a URL bound to the exact type and size, PUTs the file, then registers it', async () => {
    const photo = await uploadTankPhoto(api, 4, {
      uri: 'file:///a.jpg',
      mimeType: 'image/jpeg',
    });

    expect(calls).toEqual([
      {
        method: 'POST',
        path: '/api/tanks/4/photos/upload-url',
        body: {
          contentType: 'image/jpeg',
          sizeBytes: 1234,
        },
      },
      {
        method: 'POST',
        path: '/api/tanks/4/photos',
        body: { storageKey: 'tanks/4/key.jpg' },
      },
    ]);
    expect(upload).toHaveBeenCalledWith('http://storage.test/put-here', 'file:///a.jpg', {
      httpMethod: 'PUT',
      uploadType: 0,
      headers: { 'Content-Type': 'image/jpeg' },
    });
    expect(photo).toEqual(PHOTO);
  });

  it('refuses an unsupported type or an oversized file before calling anything', async () => {
    await expect(uploadTankPhoto(api, 4, { uri: 'file:///a.gif' })).rejects.toEqual(new PhotoUploadError('unsupportedType'));

    getInfo.mockResolvedValue({
      exists: true,
      size: MAX_PHOTO_BYTES + 1,
      uri: 'file:///a.jpg',
      isDirectory: false,
      modificationTime: 0,
    });
    await expect(uploadTankPhoto(api, 4, { uri: 'file:///a.jpg' })).rejects.toMatchObject({ failure: 'tooLarge' });

    expect(calls).toEqual([]);
    expect(upload).not.toHaveBeenCalled();
  });

  it('does not register a photo whose upload storage refused', async () => {
    upload.mockResolvedValue({
      status: 403,
      body: 'SignatureDoesNotMatch',
      headers: {},
      mimeType: null,
    });

    await expect(uploadTankPhoto(api, 4, { uri: 'file:///a.jpg' })).rejects.toMatchObject({ failure: 'failed' });
    expect(calls.map((call) => call.path)).toEqual(['/api/tanks/4/photos/upload-url']);
  });

  it('fails when the registration is refused', async () => {
    failRegister = true;

    await expect(uploadTankPhoto(api, 4, { uri: 'file:///a.jpg' })).rejects.toMatchObject({ failure: 'failed' });
  });
});

import * as FileSystem from 'expo-file-system';
import type {
  ApiClient, Schemas,
} from '@pethouse/api-client';

export type TankPhoto = Schemas['TankPhotoResponseDto'];

export type PhotoContentType = Schemas['RequestPhotoUploadDto']['contentType'];

/** Mirrors the API's limit: the upload URL is refused above it. */
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

const TYPES_BY_EXTENSION: Record<string, PhotoContentType> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
};

const ACCEPTED_TYPES: readonly PhotoContentType[] = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

/** A picture chosen on the device, as the image picker describes it. */
export interface PickedImage {
  uri: string;
  mimeType?: string | null;
}

export type PhotoUploadFailure = 'unsupportedType' | 'tooLarge' | 'failed';

export class PhotoUploadError extends Error {
  constructor (readonly failure: PhotoUploadFailure) {
    super(failure);
  }
}

function isAccepted (type: string): type is PhotoContentType {
  return ACCEPTED_TYPES.some((accepted) => accepted === type);
}

/** The picker's MIME type when it gives one, else the file extension; null when not accepted. */
export function contentTypeOf (image: PickedImage): PhotoContentType | null {
  const declared = image.mimeType?.toLowerCase().replace('image/jpg', 'image/jpeg');

  if (declared) {
    return isAccepted(declared) ? declared : null;
  }

  const extension = /\.([a-z0-9]+)$/i.exec(image.uri.split('?')[0] ?? '')?.[1]?.toLowerCase();

  return extension === undefined ? null : TYPES_BY_EXTENSION[extension] ?? null;
}

async function sizeOf (uri: string): Promise<number> {
  const info = await FileSystem.getInfoAsync(uri);

  if (!info.exists) {
    throw new PhotoUploadError('failed');
  }

  return info.size;
}

/**
 * The three steps of a photo upload: ask the API for a URL bound to the file's exact type and
 * size, PUT the file straight to storage (streamed from disk, never loaded into memory), then
 * register it on the tank.
 */
export async function uploadTankPhoto (api: ApiClient, tankId: number, image: PickedImage): Promise<TankPhoto> {
  const contentType = contentTypeOf(image);

  if (contentType === null) {
    throw new PhotoUploadError('unsupportedType');
  }

  const sizeBytes = await sizeOf(image.uri);

  if (sizeBytes > MAX_PHOTO_BYTES) {
    throw new PhotoUploadError('tooLarge');
  }

  const path = { path: { tankId } };
  const { data: target } = await api.POST('/api/tanks/{tankId}/photos/upload-url', {
    params: path,
    body: {
      contentType,
      sizeBytes,
    },
  });

  if (!target) {
    throw new PhotoUploadError('failed');
  }

  const upload = await FileSystem.uploadAsync(target.uploadUrl, image.uri, {
    httpMethod: target.method,
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: { 'Content-Type': contentType },
  });

  if (upload.status < 200 || upload.status >= 300) {
    throw new PhotoUploadError('failed');
  }

  const { data: photo } = await api.POST('/api/tanks/{tankId}/photos', {
    params: path,
    body: { storageKey: target.storageKey },
  });

  if (!photo) {
    throw new PhotoUploadError('failed');
  }

  return photo;
}

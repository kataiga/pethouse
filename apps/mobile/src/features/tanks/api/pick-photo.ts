import * as ImagePicker from 'expo-image-picker';
import type { PickedImage } from './upload-photo';

export type PhotoSource = 'camera' | 'library';

export type PickResult = { kind: 'picked';
  image: PickedImage } | { kind: 'cancelled' } | { kind: 'denied' };

/** JPEG at this quality stays well under the upload limit and turns HEIC into JPEG. */
const OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.8,
  exif: false,
};

/**
 * One picture from the camera or the gallery. The gallery goes through the system photo picker,
 * which needs no permission; the camera does.
 */
export async function pickPhoto (source: PhotoSource): Promise<PickResult> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      return { kind: 'denied' };
    }
  }

  const result = source === 'camera'
    ? await ImagePicker.launchCameraAsync(OPTIONS)
    : await ImagePicker.launchImageLibraryAsync(OPTIONS);
  const asset = result.canceled ? undefined : result.assets[0];

  return asset === undefined
    ? { kind: 'cancelled' }
    : {
      kind: 'picked',
      image: {
        uri: asset.uri,
        mimeType: asset.mimeType ?? null,
      },
    };
}

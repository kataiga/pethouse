import {
  Redirect, useLocalSearchParams,
} from 'expo-router';
import { PhotoGalleryScreen } from '@/features/tanks/components/photo-gallery-screen';
import { idParam } from '@/features/tanks/route-param';

export default function PhotosRoute (): React.JSX.Element {
  const tankId = idParam(useLocalSearchParams<{ tankId: string }>().tankId);

  return tankId === null ? <Redirect href="/tanks" /> : <PhotoGalleryScreen tankId={tankId} />;
}

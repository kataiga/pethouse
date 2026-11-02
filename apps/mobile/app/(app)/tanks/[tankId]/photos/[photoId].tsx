import {
  Redirect, useLocalSearchParams,
} from 'expo-router';
import { PhotoViewerScreen } from '@/features/tanks/components/photo-viewer-screen';
import { idParam } from '@/features/tanks/route-param';

export default function PhotoRoute (): React.JSX.Element {
  const params = useLocalSearchParams<{ tankId: string;
    photoId: string }>();
  const tankId = idParam(params.tankId);
  const photoId = idParam(params.photoId);

  return tankId === null || photoId === null
    ? <Redirect href="/tanks" />
    : <PhotoViewerScreen photoId={photoId} tankId={tankId} />;
}

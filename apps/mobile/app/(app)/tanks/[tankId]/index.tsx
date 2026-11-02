import {
  Redirect, useLocalSearchParams,
} from 'expo-router';
import { TankDetailScreen } from '@/features/tanks/components/tank-detail-screen';
import { idParam } from '@/features/tanks/route-param';

export default function TankRoute (): React.JSX.Element {
  const tankId = idParam(useLocalSearchParams<{ tankId: string }>().tankId);

  return tankId === null ? <Redirect href="/tanks" /> : <TankDetailScreen tankId={tankId} />;
}

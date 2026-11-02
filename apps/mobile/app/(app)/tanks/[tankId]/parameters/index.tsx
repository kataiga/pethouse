import {
  Redirect, useLocalSearchParams,
} from 'expo-router';
import { TankParametersScreen } from '@/features/parameters/components/tank-parameters-screen';
import { idParam } from '@/features/tanks/route-param';

export default function TankParametersRoute (): React.JSX.Element {
  const tankId = idParam(useLocalSearchParams<{ tankId: string }>().tankId);

  return tankId === null ? <Redirect href="/tanks" /> : <TankParametersScreen tankId={tankId} />;
}

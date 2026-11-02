import {
  Redirect, useLocalSearchParams,
} from 'expo-router';
import { MeasureScreen } from '@/features/parameters/components/measure-screen';
import { idParam } from '@/features/tanks/route-param';

export default function MeasureRoute (): React.JSX.Element {
  const tankId = idParam(useLocalSearchParams<{ tankId: string }>().tankId);

  return tankId === null ? <Redirect href="/tanks" /> : <MeasureScreen tankId={tankId} />;
}

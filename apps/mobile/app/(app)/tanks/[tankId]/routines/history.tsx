import {
  Redirect, useLocalSearchParams,
} from 'expo-router';
import { RoutineHistoryScreen } from '@/features/routines/components/routine-history-screen';
import { idParam } from '@/features/tanks/route-param';

export default function RoutineHistoryRoute (): React.JSX.Element {
  const tankId = idParam(useLocalSearchParams<{ tankId: string }>().tankId);

  return tankId === null ? <Redirect href="/tanks" /> : <RoutineHistoryScreen tankId={tankId} />;
}

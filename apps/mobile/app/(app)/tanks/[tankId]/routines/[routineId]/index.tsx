import {
  Redirect, useLocalSearchParams,
} from 'expo-router';
import { RoutineDetailScreen } from '@/features/routines/components/routine-detail-screen';
import { idParam } from '@/features/tanks/route-param';

/** `pethouse://tanks/<tankId>/routines/<routineId>`: where a routine's notification leads. */
export default function RoutineRoute (): React.JSX.Element {
  const params = useLocalSearchParams<{ tankId: string;
    routineId: string }>();
  const tankId = idParam(params.tankId);
  const routineId = idParam(params.routineId);

  return tankId === null || routineId === null
    ? <Redirect href="/tanks" />
    : <RoutineDetailScreen routineId={routineId} tankId={tankId} />;
}

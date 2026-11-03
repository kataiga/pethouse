import {
  Redirect, useLocalSearchParams,
} from 'expo-router';
import { RoutineFormScreen } from '@/features/routines/components/routine-form-screen';
import { idParam } from '@/features/tanks/route-param';

export default function EditRoutineRoute (): React.JSX.Element {
  const params = useLocalSearchParams<{ tankId: string;
    routineId: string }>();
  const tankId = idParam(params.tankId);
  const routineId = idParam(params.routineId);

  return tankId === null || routineId === null
    ? <Redirect href="/tanks" />
    : <RoutineFormScreen routineId={routineId} tankId={tankId} />;
}

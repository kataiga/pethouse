import {
  Redirect, useLocalSearchParams,
} from 'expo-router';
import { RoutineFormScreen } from '@/features/routines/components/routine-form-screen';
import { idParam } from '@/features/tanks/route-param';

export default function NewRoutineRoute (): React.JSX.Element {
  const tankId = idParam(useLocalSearchParams<{ tankId: string }>().tankId);

  return tankId === null ? <Redirect href="/tanks" /> : <RoutineFormScreen tankId={tankId} />;
}

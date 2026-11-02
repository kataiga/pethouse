import {
  Redirect, useLocalSearchParams,
} from 'expo-router';
import { EditTankScreen } from '@/features/tanks/components/edit-tank-screen';
import { idParam } from '@/features/tanks/route-param';

export default function EditTankRoute (): React.JSX.Element {
  const tankId = idParam(useLocalSearchParams<{ tankId: string }>().tankId);

  return tankId === null ? <Redirect href="/tanks" /> : <EditTankScreen tankId={tankId} />;
}

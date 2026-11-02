import {
  Redirect, useLocalSearchParams,
} from 'expo-router';
import { AddInhabitantScreen } from '@/features/tanks/components/add-inhabitant-screen';
import { idParam } from '@/features/tanks/route-param';

export default function AddInhabitantRoute (): React.JSX.Element {
  const params = useLocalSearchParams<{ tankId: string;
    kind?: string }>();
  const tankId = idParam(params.tankId);

  return tankId === null
    ? <Redirect href="/tanks" />
    : <AddInhabitantScreen initialKind={params.kind === 'plants' ? 'plants' : 'animals'} tankId={tankId} />;
}

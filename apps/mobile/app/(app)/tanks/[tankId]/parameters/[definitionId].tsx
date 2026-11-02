import {
  Redirect, useLocalSearchParams,
} from 'expo-router';
import { HistoryScreen } from '@/features/parameters/components/history-screen';
import { idParam } from '@/features/tanks/route-param';

export default function HistoryRoute (): React.JSX.Element {
  const params = useLocalSearchParams<{ tankId: string;
    definitionId: string }>();
  const tankId = idParam(params.tankId);
  const definitionId = idParam(params.definitionId);

  return tankId === null || definitionId === null
    ? <Redirect href="/tanks" />
    : <HistoryScreen definitionId={definitionId} tankId={tankId} />;
}

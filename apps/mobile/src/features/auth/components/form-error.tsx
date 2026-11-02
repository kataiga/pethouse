import { useTranslation } from 'react-i18next';
import { Pill } from '@/components/ui/pill';
import type { AuthError } from '../hooks/use-auth';

/** The server's answer to a submitted form, in plain words. */
export function FormError ({ error }: { error: AuthError | null }): React.JSX.Element | null {
  const { t } = useTranslation();

  if (!error) {
    return null;
  }

  return <Pill label={t(`auth.errors.${error.failure}`)} tone="late" />;
}

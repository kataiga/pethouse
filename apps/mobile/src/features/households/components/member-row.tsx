import { useTranslation } from 'react-i18next';
import {
  Alert, StyleSheet, View,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import { space } from '@/theme';
import type {
  Member, Role,
} from '../hooks/use-members';

export interface MemberRowProps {
  member: Member;
  isSelf: boolean;
  /** The current person may manage others. */
  canManage: boolean;
  busy: boolean;
  onChangeRole: (role: Role) => void;
  onRemove: () => void;
}

/** One member, with the actions the current person is allowed to take on them. */
export function MemberRow ({
  member, isSelf, canManage, busy, onChangeRole, onRemove,
}: MemberRowProps): React.JSX.Element {
  const { t } = useTranslation();
  const owner = member.role === 'OWNER';

  const confirm = (title: string, message: string, action: string, onConfirm: () => void): void => {
    Alert.alert(title, message, [
      {
        text: t('common.cancel'),
        style: 'cancel',
      },
      {
        text: action,
        style: 'destructive',
        onPress: onConfirm,
      },
    ]);
  };

  return (
    <View style={styles.row} testID={`member-${member.userId}`}>
      <View style={styles.identity}>
        <AppText variant="heading">
          {isSelf ? t('household.members.you', { name: member.displayName }) : member.displayName}
        </AppText>
        <AppText tone="soft" variant="caption">{member.email}</AppText>
        <Pill label={owner ? t('household.roles.owner') : t('household.roles.member')} tone={owner ? 'info' : 'done'} />
      </View>
      <View style={styles.actions}>
        {canManage && !isSelf ? (
          <Button
            disabled={busy}
            label={owner ? t('household.members.demote') : t('household.members.promote')}
            onPress={() => onChangeRole(owner ? 'MEMBER' : 'OWNER')}
            testID={`member-${member.userId}-role`}
            variant="soft"
          />
        ) : null}
        {canManage && !isSelf ? (
          <Button
            disabled={busy}
            label={t('household.members.remove')}
            onPress={() => confirm(
              t('household.members.removeTitle', { name: member.displayName }),
              t('household.members.removeBody'),
              t('household.members.remove'),
              onRemove,
            )}
            testID={`member-${member.userId}-remove`}
            variant="soft"
          />
        ) : null}
        {isSelf ? (
          <Button
            disabled={busy}
            label={t('household.members.leave')}
            onPress={() => confirm(
              t('household.members.leaveTitle'),
              t('household.members.leaveBody'),
              t('household.members.leave'),
              onRemove,
            )}
            testID="member-leave"
            variant="soft"
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: space.sm,
    paddingVertical: space.sm,
  },
  identity: { gap: space.xs },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
});

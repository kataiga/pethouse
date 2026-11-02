import {
  router, Stack,
} from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import { Screen } from '@/components/ui/screen';
import { Surface } from '@/components/ui/surface';
import { TextField } from '@/components/ui/text-field';
import { formatInstantDate } from '@/lib/i18n/format';
import {
  radius, space, useTheme,
} from '@/theme';
import {
  type TankPhoto, useDeletePhoto, usePhotos, useUpdatePhoto,
} from '../hooks/use-photos';
import {
  type Tank, useTank, useUpdateTank,
} from '../hooks/use-tanks';

function PhotoDetail ({ tank, photo }: { tank: Tank;
  photo: TankPhoto }): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const [caption, setCaption] = useState(photo.caption ?? '');
  const update = useUpdatePhoto(tank.id, photo.id);
  const setCover = useUpdateTank(tank);
  const remove = useDeletePhoto(tank, photo.id);
  const isCover = tank.coverPhoto?.id === photo.id;
  const trimmed = caption.trim();
  const failed = update.isError || setCover.isError || remove.isError;

  const confirmDelete = (): void => {
    Alert.alert(t('tanks.photo.deleteTitle'), t('tanks.photo.deleteBody'), [
      {
        text: t('common.cancel'),
        style: 'cancel',
      },
      {
        text: t('tanks.photo.delete'),
        style: 'destructive',
        onPress: () => remove.mutate(undefined, { onSuccess: () => router.back() }),
      },
    ]);
  };

  return (
    <>
      <Image accessibilityIgnoresInvertColors resizeMode="contain" source={{ uri: photo.url }} style={styles.image} />
      <AppText tone="soft" variant="caption">
        {t('tanks.photo.by', {
          name: photo.uploadedBy.displayName,
          date: formatInstantDate(photo.takenAt ?? photo.createdAt, i18n.language),
        })}
      </AppText>
      {failed ? <AppText tone="ambre">{t('tanks.photo.failed')}</AppText> : null}
      <TextField
        label={t('tanks.photo.caption')}
        maxLength={200}
        onChangeText={setCaption}
        testID="photo-caption"
        value={caption}
      />
      <Button
        disabled={trimmed === (photo.caption ?? '')}
        label={t('common.save')}
        loading={update.isPending}
        onPress={() => update.mutate({ caption: trimmed === '' ? null : trimmed })}
        testID="photo-caption-save"
        variant="soft"
      />
      {isCover ? (
        <Pill label={t('tanks.photo.isCover')} tone="done" />
      ) : (
        <Button
          label={t('tanks.photo.setCover')}
          loading={setCover.isPending}
          onPress={() => setCover.mutate({ coverPhotoId: photo.id })}
          testID="photo-set-cover"
          variant="soft"
        />
      )}
      <Button
        label={t('tanks.photo.delete')}
        loading={remove.isPending}
        onPress={confirmDelete}
        testID="photo-delete"
        variant="soft"
      />
    </>
  );
}

/** One photo full width, with its caption, the cover choice and deletion. */
export function PhotoViewerScreen ({ tankId, photoId }: { tankId: number;
  photoId: number }): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const tank = useTank(tankId);
  const photos = usePhotos(tankId);
  const photo = photos.data?.find((candidate) => candidate.id === photoId);
  const failed = tank.isError || photos.isError;

  return (
    <Screen testID="photo-viewer-screen">
      <Stack.Screen options={{ title: t('tanks.photo.title') }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {(tank.isPending || photos.isPending) && !failed
            ? <ActivityIndicator color={colors.lagon} size="large" />
            : null}
          {failed ? (
            <Surface>
              <AppText tone="ambre">{t('tanks.photos.error')}</AppText>
              <Button
                label={t('common.retry')}
                onPress={() => {
                  void tank.refetch();
                  void photos.refetch();
                }}
                variant="soft"
              />
            </Surface>
          ) : null}
          {tank.data === null || (photos.data && !photo) ? (
            <Surface>
              <AppText>{t('tanks.photo.notFound')}</AppText>
            </Surface>
          ) : null}
          {tank.data && photo ? <PhotoDetail photo={photo} tank={tank.data} /> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: {
    gap: space.md,
    paddingBottom: space.xxl,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.md,
  },
});

import {
  Stack, router, 
} from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, View,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Surface } from '@/components/ui/surface';
import {
  radius, space, useTheme,
} from '@/theme';
import {
  type PhotoSource, pickPhoto,
} from '../api/pick-photo';
import { PhotoUploadError } from '../api/upload-photo';
import {
  usePhotos, useUploadPhoto,
} from '../hooks/use-photos';

/** Every photo of a tank, newest first, and the way to add one. */
export function PhotoGalleryScreen ({ tankId }: { tankId: number }): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const photos = usePhotos(tankId);
  const upload = useUploadPhoto(tankId);
  const failure = upload.error instanceof PhotoUploadError ? upload.error.failure : 'failed';

  const add = async (source: PhotoSource): Promise<void> => {
    const result = await pickPhoto(source);

    if (result.kind === 'denied') {
      Alert.alert(t('tanks.photos.cameraDenied'));
    }
    if (result.kind === 'picked') {
      upload.mutate(result.image);
    }
  };

  const chooseSource = (): void => {
    Alert.alert(t('tanks.photos.sourceTitle'), undefined, [
      {
        text: t('tanks.photos.camera'),
        onPress: () => void add('camera'),
      },
      {
        text: t('tanks.photos.library'),
        onPress: () => void add('library'),
      },
      {
        text: t('common.cancel'),
        style: 'cancel',
      },
    ]);
  };

  return (
    <Screen testID="photo-gallery-screen">
      <Stack.Screen options={{ title: t('tanks.photos.title') }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Button
          disabled={upload.isPending}
          label={t('tanks.photos.add')}
          onPress={chooseSource}
          testID="gallery-add"
        />
        {upload.isPending ? (
          <Surface style={styles.status} testID="gallery-uploading">
            <ActivityIndicator color={colors.lagon} />
            <AppText tone="soft">{t('tanks.photos.uploading')}</AppText>
          </Surface>
        ) : null}
        {upload.isError ? (
          <Surface testID="gallery-upload-error">
            <AppText tone="ambre">{t(`tanks.photos.errors.${failure}`)}</AppText>
            {failure === 'failed' && upload.variables ? (
              <Button
                label={t('common.retry')}
                onPress={() => {
                  if (upload.variables) {
                    upload.mutate(upload.variables);
                  }
                }}
                testID="gallery-upload-retry"
                variant="soft"
              />
            ) : null}
          </Surface>
        ) : null}
        {photos.isPending ? <ActivityIndicator color={colors.lagon} size="large" /> : null}
        {photos.isError ? (
          <Surface>
            <AppText tone="ambre">{t('tanks.photos.error')}</AppText>
            <Button label={t('common.retry')} onPress={() => void photos.refetch()} variant="soft" />
          </Surface>
        ) : null}
        {photos.data?.length === 0 && !upload.isPending ? (
          <Surface>
            <AppText tone="soft">{t('tanks.photos.empty')}</AppText>
          </Surface>
        ) : null}
        <View style={styles.grid}>
          {photos.data?.map((photo) => (
            <Pressable
              accessibilityLabel={photo.caption ?? t('tanks.photo.title')}
              accessibilityRole="imagebutton"
              key={photo.id}
              onPress={() => router.push(`/tanks/${tankId}/photos/${photo.id}`)}
              style={styles.cell}
              testID={`gallery-photo-${photo.id}`}
            >
              <Image accessibilityIgnoresInvertColors source={{ uri: photo.url }} style={styles.image} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: space.lg,
    paddingBottom: space.xxl,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  cell: { width: '31.5%' },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.sm,
  },
});

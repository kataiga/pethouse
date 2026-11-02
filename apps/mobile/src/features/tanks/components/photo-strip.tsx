import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';
import {
  radius, space, useTheme,
} from '@/theme';
import { usePhotos } from '../hooks/use-photos';

const STRIP_SIZE = 6;

/** The latest photos of a tank, with the way into the gallery. */
export function PhotoStrip ({ tankId }: { tankId: number }): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const photos = usePhotos(tankId);
  const gallery = `/tanks/${tankId}/photos` as const;

  return (
    <Surface testID="photo-strip">
      <View style={styles.header}>
        <AppText tone="soft" variant="label">{t('tanks.photos.title')}</AppText>
        {photos.data && photos.data.length > 0 ? (
          <Pressable
            accessibilityRole="link"
            hitSlop={space.sm}
            onPress={() => router.push(gallery)}
            testID="photos-see-all"
          >
            <AppText tone="lagon" variant="strong">{t('tanks.photos.seeAll')}</AppText>
          </Pressable>
        ) : null}
      </View>
      {photos.isPending ? <ActivityIndicator color={colors.lagon} /> : null}
      {photos.isError ? (
        <>
          <AppText tone="ambre">{t('tanks.photos.error')}</AppText>
          <Button label={t('common.retry')} onPress={() => void photos.refetch()} variant="soft" />
        </>
      ) : null}
      {photos.data?.length === 0 ? (
        <>
          <AppText tone="soft">{t('tanks.photos.empty')}</AppText>
          <Button
            label={t('tanks.photos.add')}
            onPress={() => router.push(gallery)}
            testID="photos-add"
            variant="soft"
          />
        </>
      ) : null}
      {photos.data && photos.data.length > 0 ? (
        <ScrollView contentContainerStyle={styles.strip} horizontal showsHorizontalScrollIndicator={false}>
          {photos.data.slice(0, STRIP_SIZE).map((photo) => (
            <Pressable
              accessibilityLabel={photo.caption ?? t('tanks.photo.title')}
              accessibilityRole="imagebutton"
              key={photo.id}
              onPress={() => router.push(`/tanks/${tankId}/photos/${photo.id}`)}
              testID={`strip-photo-${photo.id}`}
            >
              <Image accessibilityIgnoresInvertColors source={{ uri: photo.url }} style={styles.thumb} />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  strip: { gap: space.sm },
  thumb: {
    width: 96,
    height: 96,
    borderRadius: radius.sm,
  },
});

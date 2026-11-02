import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  fonts, useTheme,
} from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function icon (name: IconName) {
  return function TabIcon ({ color, size }: { color: string;
    size: number }): React.JSX.Element {
    return <Ionicons color={color} name={name} size={size} />;
  };
}

export default function TabsLayout (): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.lagon,
        tabBarInactiveTintColor: colors.inkSoft,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
        },
        tabBarLabelStyle: { fontFamily: fonts.semibold },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.today'),
        tabBarIcon: icon('sunny-outline') }} />
      <Tabs.Screen name="tanks" options={{ title: t('tabs.tanks'),
        tabBarIcon: icon('water-outline') }} />
      <Tabs.Screen name="household" options={{ title: t('tabs.household'),
        tabBarIcon: icon('people-outline') }} />
      <Tabs.Screen name="account" options={{ title: t('tabs.account'),
        tabBarIcon: icon('person-circle-outline') }} />
    </Tabs>
  );
}

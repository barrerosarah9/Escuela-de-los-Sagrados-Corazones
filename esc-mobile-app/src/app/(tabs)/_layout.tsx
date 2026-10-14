import { Tabs } from 'expo-router';
import { TabIcon } from '../../components/tab-icon';
import { colors, fonts } from '../../theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: { fontFamily: fonts.sansSemiBold, fontSize: 10 },
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.serif, fontSize: 22 },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'home' : 'home-outline'} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="oracion"
        options={{
          title: 'Oración',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'heart' : 'heart-outline'} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="tienda"
        options={{
          title: 'Tienda',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? 'bag-handle' : 'bag-handle-outline'}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'person' : 'person-outline'} color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

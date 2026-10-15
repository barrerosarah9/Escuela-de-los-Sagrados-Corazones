import { Stack } from 'expo-router';
import { colors } from '../../theme';

export const unstable_settings = {
  initialRouteName: 'bienvenida',
};

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}

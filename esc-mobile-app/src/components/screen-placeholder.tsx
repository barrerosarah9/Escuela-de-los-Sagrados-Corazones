import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import { AppText } from './app-text';

type Props = {
  title: string;
};

export function ScreenPlaceholder({ title }: Props) {
  return (
    <View style={styles.container}>
      <AppText variant="title">{title}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});

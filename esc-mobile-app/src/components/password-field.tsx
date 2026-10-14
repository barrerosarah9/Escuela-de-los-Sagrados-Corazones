import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ComponentProps } from 'react';
import { Pressable } from 'react-native';
import { colors } from '../theme';
import { TextField } from './text-field';

type Props = Omit<ComponentProps<typeof TextField>, 'secureTextEntry' | 'accessory'>;

export function PasswordField(props: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      autoCapitalize="none"
      autoCorrect={false}
      secureTextEntry={!visible}
      accessory={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          hitSlop={8}
          onPress={() => setVisible((value) => !value)}
        >
          <Ionicons
            name={visible ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={colors.textSecondary}
          />
        </Pressable>
      }
      {...props}
    />
  );
}

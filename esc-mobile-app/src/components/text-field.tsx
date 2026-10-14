import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ReactNode } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { colors, fonts, radius } from '../theme';
import { AppText } from './app-text';

type Props = TextInputProps & {
  label: string;
  error?: string;
  accessory?: ReactNode;
};

export function TextField({ label, error, accessory, style, onFocus, onBlur, ...rest }: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      <AppText variant="label">{label}</AppText>
      <View>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.placeholder}
          style={[
            styles.input,
            accessory ? styles.inputWithAccessory : null,
            focused && styles.inputFocused,
            error ? styles.inputError : null,
            style,
          ]}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          {...rest}
        />
        {accessory ? <View style={styles.accessory}>{accessory}</View> : null}
      </View>
      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={12} color={colors.primary} />
          <AppText variant="caption" color={colors.primary}>
            {error}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 7,
  },
  input: {
    height: 54,
    paddingHorizontal: 16,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    color: colors.text,
    fontFamily: fonts.sans,
    fontSize: 15,
  },
  inputWithAccessory: {
    paddingRight: 48,
  },
  inputFocused: {
    borderColor: colors.sky,
    borderWidth: 1.5,
  },
  inputError: {
    borderColor: colors.primary,
    backgroundColor: colors.errorSoft,
  },
  accessory: {
    position: 'absolute',
    right: 9,
    top: 7,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
});

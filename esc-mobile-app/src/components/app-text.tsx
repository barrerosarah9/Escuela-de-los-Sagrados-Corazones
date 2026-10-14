import { Text, type TextProps } from 'react-native';
import { colors, textVariants } from '../theme';

type Variant = keyof typeof textVariants;

type Props = TextProps & {
  variant?: Variant;
  color?: string;
};

const defaultColor: Record<Variant, string> = {
  display: colors.text,
  title: colors.text,
  subtitle: colors.primary,
  eyebrow: colors.primary,
  body: colors.text,
  label: colors.text,
  caption: colors.textSecondary,
};

export function AppText({ variant = 'body', color, style, ...rest }: Props) {
  return (
    <Text
      style={[textVariants[variant], { color: color ?? defaultColor[variant] }, style]}
      {...rest}
    />
  );
}

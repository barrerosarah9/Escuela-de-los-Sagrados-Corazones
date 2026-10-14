import { StyleSheet } from 'react-native';

export const fonts = {
  sans: 'DMSans_400Regular',
  sansMedium: 'DMSans_500Medium',
  sansSemiBold: 'DMSans_600SemiBold',
  sansBold: 'DMSans_700Bold',
  serif: 'Newsreader_500Medium',
} as const;

export const textVariants = StyleSheet.create({
  display: { fontFamily: fonts.serif, fontSize: 42, lineHeight: 44, letterSpacing: -1.4 },
  title: { fontFamily: fonts.serif, fontSize: 29, lineHeight: 31, letterSpacing: -1 },
  subtitle: { fontFamily: fonts.serif, fontSize: 24, lineHeight: 26, letterSpacing: -0.5 },
  eyebrow: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 1.7,
    textTransform: 'uppercase',
  },
  body: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 21 },
  label: { fontFamily: fonts.sansBold, fontSize: 12 },
  caption: { fontFamily: fonts.sans, fontSize: 10, lineHeight: 14 },
});

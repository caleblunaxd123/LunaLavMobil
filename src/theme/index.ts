import { Platform, type TextStyle, type ViewStyle } from 'react-native';
import { colors } from './colors';

export { colors };

export const fonts = {
  regular: 'Montserrat_400Regular',
  medium: 'Montserrat_500Medium',
  semibold: 'Montserrat_600SemiBold',
  bold: 'Montserrat_700Bold',
  extrabold: 'Montserrat_800ExtraBold',
};

/** Escala tipográfica: pocas variantes, siempre las mismas en toda la app. */
export const type = {
  display: { fontFamily: fonts.extrabold, fontSize: 27, lineHeight: 34, letterSpacing: -0.5, color: colors.text },
  title: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3, color: colors.text },
  heading: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 23, color: colors.text },
  subheading: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21, color: colors.text },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.textSecondary },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22, color: colors.text },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.muted },
  captionStrong: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  overline: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.muted },
  number: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 30, letterSpacing: -0.4, color: colors.text },
} satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 };

export const shadow = {
  sm: Platform.select<ViewStyle>({
    ios: { shadowColor: '#101828', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
    default: { elevation: 1 },
  }),
  md: Platform.select<ViewStyle>({
    ios: { shadowColor: '#101828', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
    default: { elevation: 4 },
  }),
};

/** Altura mínima táctil recomendada (Android 48dp, iOS 44pt). */
export const touch = 48;

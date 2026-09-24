import { Text, type TextProps, type TextStyle } from 'react-native';
import { type as typeScale, type TypeVariant } from '../../theme';

export interface AppTextProps extends TextProps {
  variant?: TypeVariant;
  color?: string;
  align?: TextStyle['textAlign'];
}

export function AppText({ variant = 'body', color, align, style, ...props }: AppTextProps) {
  return <Text {...props} style={[typeScale[variant], color ? { color } : null, align ? { textAlign: align } : null, style]} />;
}

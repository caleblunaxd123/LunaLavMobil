import { useId } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { LOGO_ASPECT, LOGO_SVG, LOGO_WHITE_SVG, MARK_SVG, MARK_WHITE_SVG } from './logoSvg';

type Variant = 'color' | 'white';

/**
 * Los SVG usan ids (`ll-m`, `ll-c`) para la máscara de la ola. En web los ids son globales:
 * si dos logos comparten id, uno toma la máscara del otro. Cada instancia usa ids propios.
 */
function useScopedXml(xml: string) {
  const scope = `ll${useId().replace(/[^a-zA-Z0-9]/g, '')}-`;
  return xml.replaceAll('ll-', scope);
}

/** Símbolo de LunaLav (luna, estrellas y ola). Cuadrado. */
export function LogoMark({ size = 44, variant = 'color', style }: { size?: number; variant?: Variant; style?: StyleProp<ViewStyle> }) {
  const xml = useScopedXml(variant === 'white' ? MARK_WHITE_SVG : MARK_SVG);
  return (
    <View style={style} accessible accessibilityRole="image" accessibilityLabel="LunaLav">
      <SvgXml xml={xml} width={size} height={size} />
    </View>
  );
}

/**
 * Logotipo horizontal de LunaLav con el lema «Gestión inteligente para lavanderías».
 * `variant="white"` es para fondos azul marino.
 */
export function Logo({ width = 220, variant = 'color', style }: { width?: number; variant?: Variant; style?: StyleProp<ViewStyle> }) {
  const xml = useScopedXml(variant === 'white' ? LOGO_WHITE_SVG : LOGO_SVG);
  const height = width / LOGO_ASPECT;
  return (
    <View style={style} accessible accessibilityRole="image" accessibilityLabel="LunaLav, gestión inteligente para lavanderías">
      <SvgXml xml={xml} width={width} height={height} />
    </View>
  );
}

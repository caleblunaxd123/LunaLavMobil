import { Linking } from 'react-native';
import { useAuthStore } from '../store/authStore';

/**
 * Abre una sección de LunaLav web en el navegador, dentro del espacio de la empresa
 * (`/{empresa}/{ruta}`). La web pide iniciar sesión con la misma cuenta si hace falta.
 */
export function useOpenWeb() {
  const session = useAuthStore((s) => s.session);
  const empresaSlug = useAuthStore((s) => s.lastLogin?.empresaSlug);
  return (path: string) => {
    if (!session) return;
    const workspace = session.isDemo ? 'demo' : empresaSlug;
    void Linking.openURL(workspace ? `${session.apiOrigin}/${workspace}/${path}` : `${session.apiOrigin}/${path}`);
  };
}

/** Página pública de LunaLav (seguimiento del pedido, enlace del repartidor), igual que la web: `/{ruta}/{token}`. */
export function usePublicUrl() {
  const origin = useAuthStore((s) => s.session?.apiOrigin);
  return (path: string) => `${origin ?? 'https://app.lunalav.pe'}/${path}`;
}

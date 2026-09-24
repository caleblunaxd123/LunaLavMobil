export interface UserSession {
  id: number;
  usuario: string;
  nombreCompleto: string;
  rol: string;
  modulosPermitidos: string[];
  negocioId: number;
  sedeId: number | null;
  sedeNombre: string | null;
}

export interface Session {
  accessToken: string;
  expira: string;
  refreshToken: string;
  usuario: UserSession;
  apiOrigin: string;
  isDemo: boolean;
}

export interface LoginPayload {
  empresaSlug: string;
  usuario: string;
  password: string;
}
